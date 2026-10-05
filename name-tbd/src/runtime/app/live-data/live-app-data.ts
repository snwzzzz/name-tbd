import { Signal, computed, signal } from '@angular/core';
import { AppData, DataConflict, DataSourceInfo, DataSync } from '../../../app/core/ports/app-ports';
import { DataSourceSnapshot } from '../../../app/core/ports/memory-app-data';
import { TableData } from '../../../app/_types/data-source.types';
import { DataApiClient, OfflineError } from './data-api-client';
import { OfflineState, OfflineStore, QueuedChange } from './offline-store';

/** What LiveAppData needs from the page around it. */
export interface LiveAppDataOptions {
  /** The data sources as the definition describes them (columns, read-only); their rows come from the API. */
  sources: DataSourceSnapshot[];
  client: DataApiClient;
  /** Where to keep rows and waiting changes for offline use; null: live only (nothing kept). */
  store: Promise<OfflineStore> | null;
  /** Tells the user something (a change that overwrote someone else's, changes sent after being offline). */
  notify?: (text: string, tone: 'info' | 'success' | 'warning' | 'error') => void;
  /** Where to listen for online/offline and focus (default: the window). */
  events?: Pick<Window, 'addEventListener'> | null;
  /** How often to retry sending waiting changes, in ms (default 30 s). */
  retryMs?: number;
}

/**
 * A live export's data: rows read and written through the data API (where the customer keeps them), so
 * everyone using the app sees the same data. Changes show at once and are sent right away.
 * <p>
 * With an offline store, the rows last read are kept in the browser, and changes made while the server
 * can't be reached wait there (in order) until it can: when the browser is back online, on the next change,
 * and every half minute. A change made on data someone else changed meanwhile still wins (last write wins);
 * the user is told what it overwrote (`sync().conflicts`). Without a store (live only), a change made
 * offline fails and is undone.
 * <p>
 * Other people's changes show on the next read: when a data source is opened, when the window gets the
 * focus again, or on refresh().
 */
export class LiveAppData implements AppData {
  private readonly tables = signal<Record<number, TableData>>({});
  private readonly loads = new Map<number, Promise<void>>();
  private readonly state = signal<DataSync>({ online: true, pending: 0, conflicts: [], error: null });
  private readonly byId = new Map<number, DataSourceSnapshot>();
  private queue: QueuedChange[] = [];
  private store: OfflineStore | null = null;
  private readonly ready: Promise<void>;
  private replaying: Promise<void> | null = null;
  private nextTemp = 0;

  readonly loaded = signal(true).asReadonly();
  readonly sync: Signal<DataSync> = this.state.asReadonly();
  readonly sources = computed<DataSourceInfo[]>(() =>
    this.options.sources.map((s) => {
      const table = this.tables()[s.id];
      return {
        id: s.id,
        name: s.name,
        columns: table?.columns ?? s.columns,
        rowCount: table?.rows.length ?? 0,
        live: true,
        ...(s.readOnly ? { readOnly: true } : {}),
      };
    }),
  );

  constructor(private readonly options: LiveAppDataOptions) {
    for (const source of options.sources) this.byId.set(source.id, source);
    this.ready = this.restore();
    const events = options.events === undefined ? (typeof window !== 'undefined' ? window : null) : options.events;
    events?.addEventListener('online', () => void this.reconnect());
    events?.addEventListener('offline', () => this.setOnline(false));
    events?.addEventListener('focus', () => void this.refreshLoaded());
    if (options.store && typeof setInterval !== 'undefined') {
      setInterval(() => {
        if (this.queue.length) void this.replay();
      }, options.retryMs ?? 30_000);
    }
  }

  table(dataSourceId: number): TableData | null {
    return this.tables()[dataSourceId] ?? null;
  }

  ensureTable(dataSourceId: number): void {
    if (this.byId.has(dataSourceId)) void this.load(dataSourceId);
  }

  async loadTable(dataSourceId: number): Promise<TableData> {
    if (!this.byId.has(dataSourceId)) throw new Error(`There is no data source ${dataSourceId}`);
    await this.load(dataSourceId);
    const table = this.table(dataSourceId);
    if (!table) throw new Error(this.state().error ?? 'The data could not be loaded');
    return table;
  }

  async refresh(dataSourceId: number): Promise<void> {
    this.loads.delete(dataSourceId);
    await this.load(dataSourceId);
  }

  dismissConflicts(): void {
    this.state.update((s) => ({ ...s, conflicts: [] }));
  }

  async addRow(dataSourceId: number, values: string[]): Promise<void> {
    this.requireWritable(dataSourceId);
    const table = await this.loadTable(dataSourceId);
    const tempId = `tmp-${Date.now().toString(36)}-${++this.nextTemp}`;
    this.change(dataSourceId, (t) => ({ ...t, rows: [...t.rows, { id: tempId, values }] }));
    await this.send({ op: 'add', dataSourceId, tempId, values: byColumn(table.columns, values) },
      () => this.change(dataSourceId, (t) => ({ ...t, rows: t.rows.filter((r) => r.id !== tempId) })));
  }

  async updateRow(dataSourceId: number, rowId: string, values: string[]): Promise<void> {
    this.requireWritable(dataSourceId);
    const table = await this.loadTable(dataSourceId);
    const before = table.rows.find((r) => r.id === rowId);
    if (!before) throw new Error('This row no longer exists (someone may have deleted it)');
    // Only what changed, with what it was: the server leaves the rest, and spots changes made meanwhile
    const changed: Record<string, string> = {};
    const base: Record<string, string> = {};
    table.columns.forEach((column, i) => {
      if ((values[i] ?? '') !== (before.values[i] ?? '')) {
        changed[column] = values[i] ?? '';
        base[column] = before.values[i] ?? '';
      }
    });
    if (!Object.keys(changed).length) return;
    this.change(dataSourceId, (t) => ({ ...t, rows: t.rows.map((r) => (r.id === rowId ? { ...r, values } : r)) }));
    await this.send({ op: 'update', dataSourceId, rowId, values: changed, base },
      () => this.change(dataSourceId, (t) => ({ ...t, rows: t.rows.map((r) => (r.id === rowId ? before : r)) })));
  }

  async deleteRows(dataSourceId: number, rowIds: string[]): Promise<void> {
    this.requireWritable(dataSourceId);
    const table = await this.loadTable(dataSourceId);
    const removed = table.rows.filter((r) => rowIds.includes(r.id));
    this.change(dataSourceId, (t) => ({ ...t, rows: t.rows.filter((r) => !rowIds.includes(r.id)) }));
    await this.send({ op: 'delete', dataSourceId, rowIds },
      () => this.change(dataSourceId, (t) => ({ ...t, rows: [...t.rows, ...removed] })));
  }

  // ---- Reading ----

  private load(dataSourceId: number): Promise<void> {
    let load = this.loads.get(dataSourceId);
    if (!load) {
      load = this.read(dataSourceId);
      this.loads.set(dataSourceId, load);
    }
    return load;
  }

  private async read(dataSourceId: number): Promise<void> {
    await this.ready;
    // Waiting changes first, so what's read has them
    if (this.queue.length) await this.replay();
    try {
      const page = await this.options.client.read(dataSourceId);
      // Rows added while this was read (still being sent) stay
      const unsent = (this.table(dataSourceId)?.rows ?? []).filter((r) => r.id.startsWith('tmp-'));
      this.setTable(dataSourceId, {
        columns: page.columns,
        rows: [...page.rows, ...unsent],
        ...(page.truncated ? { truncated: true } : {}),
      });
      this.state.update((s) => ({ ...s, online: true, error: null }));
      await this.persist();
    } catch (err) {
      // Read again when back online, on focus, or on refresh() (not on every look at the table)
      if (err instanceof OfflineError) this.setOnline(false);
      else this.state.update((s) => ({ ...s, error: message(err) }));
      // Offline without kept rows: an empty table with the known columns, rather than nothing
      if (!this.table(dataSourceId)) this.setTable(dataSourceId, { columns: this.byId.get(dataSourceId)?.columns ?? [], rows: [] });
    }
  }

  private async refreshLoaded(): Promise<void> {
    for (const id of Object.keys(this.tables()).map(Number)) {
      if (this.loads.has(id)) await this.refresh(id);
    }
  }

  private async reconnect(): Promise<void> {
    this.setOnline(true);
    const pending = this.queue.length;
    await this.replay();
    if (pending && !this.queue.length) this.options.notify?.('Back online: the changes made offline were saved.', 'success');
    await this.refreshLoaded();
  }

  // ---- Changing ----

  /** Sends a change now. Offline: queued (with a store) or undone with an error (live only). */
  private async send(change: QueuedChange, undo: () => void): Promise<void> {
    await this.ready;
    if (this.queue.length && this.store) {
      // Earlier changes are still waiting: this one goes after them
      this.enqueue(change);
      void this.replay();
      return;
    }
    try {
      await this.apply(change);
      this.state.update((s) => ({ ...s, online: true }));
      await this.persist();
    } catch (err) {
      if (err instanceof OfflineError) {
        this.setOnline(false);
        if (this.store) {
          this.enqueue(change);
          return;
        }
        undo();
        throw new Error('You’re offline: the change wasn’t saved. Try again once you’re back online.');
      }
      undo();
      throw new Error(message(err));
    }
  }

  private enqueue(change: QueuedChange): void {
    this.queue.push(change);
    this.state.update((s) => ({ ...s, pending: this.queue.length }));
    void this.persist();
  }

  /** Makes a change on the server, and takes over what it answers (a new row's id, the row as saved). */
  private async apply(change: QueuedChange): Promise<void> {
    const client = this.options.client;
    switch (change.op) {
      case 'add': {
        const row = await client.add(change.dataSourceId, change.values);
        this.change(change.dataSourceId, (t) => ({ ...t, rows: t.rows.map((r) => (r.id === change.tempId ? row : r)) }));
        this.renameInQueue(change.tempId, row.id);
        break;
      }
      case 'update': {
        const { row, conflicts } = await client.change(change.dataSourceId, change.rowId, change.values, change.base);
        this.change(change.dataSourceId, (t) => ({ ...t, rows: t.rows.map((r) => (r.id === change.rowId ? row : r)) }));
        if (Object.keys(conflicts).length) this.conflict({ dataSourceId: change.dataSourceId, rowId: change.rowId, overwritten: conflicts, at: Date.now() });
        break;
      }
      case 'delete': {
        const ids = change.rowIds.filter((id) => !id.startsWith('tmp-'));
        if (ids.length) await client.delete(change.dataSourceId, ids);
        break;
      }
    }
  }

  private replayPromise: Promise<void> = Promise.resolve();

  /** Sends the waiting changes in order; stops at the first that can't be sent yet (still offline). */
  replay(): Promise<void> {
    this.replayPromise = this.replayPromise.then(async () => {
      if (this.queue.length && !this.replaying) {
        this.replaying = this.sendQueue();
        try {
          await this.replaying;
        } finally {
          this.replaying = null;
        }
      }
    });
    return this.replayPromise;
  }

  private async sendQueue(): Promise<void> {
    await this.ready;
    while (this.queue.length) {
      const change = this.queue[0];
      try {
        await this.apply(change);
        this.state.update((s) => ({ ...s, online: true }));
      } catch (err) {
        if (err instanceof OfflineError) {
          this.setOnline(false);
          break;
        }
        // Refused now (e.g. the row was deleted by someone else meanwhile): dropped, and said so
        const text = `A change made offline couldn’t be saved: ${message(err)}`;
        this.state.update((s) => ({ ...s, error: text }));
        this.options.notify?.(text, 'warning');
      }
      this.queue.shift();
      this.state.update((s) => ({ ...s, pending: this.queue.length }));
      await this.persist();
    }
  }

  /** A row added offline got its real id: later waiting changes use that. */
  private renameInQueue(tempId: string, id: string): void {
    this.queue = this.queue.map((c) => {
      if (c.op === 'update' && c.rowId === tempId) return { ...c, rowId: id };
      if (c.op === 'delete' && c.rowIds.includes(tempId)) return { ...c, rowIds: c.rowIds.map((r) => (r === tempId ? id : r)) };
      return c;
    });
  }

  private conflict(conflict: DataConflict): void {
    this.state.update((s) => ({ ...s, conflicts: [...s.conflicts, conflict] }));
    const name = this.byId.get(conflict.dataSourceId)?.name ?? 'the data';
    const what = Object.entries(conflict.overwritten).map(([column, value]) => `${column} was “${value}”`).join(', ');
    this.options.notify?.(`Someone else had changed this row of ${name} meanwhile (${what}); your change was saved over it.`, 'warning');
  }

  // ---- State ----

  private requireWritable(dataSourceId: number): void {
    if (this.byId.get(dataSourceId)?.readOnly) throw new Error('This data can only be read in this app');
  }

  private change(dataSourceId: number, update: (table: TableData) => TableData): void {
    const table = this.table(dataSourceId);
    if (table) this.setTable(dataSourceId, update(table));
  }

  private setTable(dataSourceId: number, table: TableData): void {
    this.tables.update((all) => ({ ...all, [dataSourceId]: table }));
  }

  private setOnline(online: boolean): void {
    if (this.state().online !== online) this.state.update((s) => ({ ...s, online }));
  }

  private async restore(): Promise<void> {
    if (!this.options.store) return;
    try {
      this.store = await this.options.store;
      const kept: OfflineState | null = await this.store.load();
      if (!kept) return;
      // Only data sources this export still has
      const tables = Object.fromEntries(Object.entries(kept.tables ?? {}).filter(([id]) => this.byId.has(Number(id))));
      this.tables.update((all) => ({ ...tables, ...all }));
      this.queue = (kept.queue ?? []).filter((c) => this.byId.has(c.dataSourceId));
      this.state.update((s) => ({ ...s, pending: this.queue.length }));
    } catch (err) {
      console.warn('[app] Could not read the data kept in this browser', err);
    }
  }

  private async persist(): Promise<void> {
    await this.store?.save({ tables: this.tables(), queue: this.queue });
  }
}

function byColumn(columns: string[], values: string[]): Record<string, string> {
  return Object.fromEntries(columns.map((column, i) => [column, values[i] ?? '']));
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
