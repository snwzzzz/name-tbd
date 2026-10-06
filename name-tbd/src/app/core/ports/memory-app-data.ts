import { computed, signal } from '@angular/core';
import { AppData, DataSourceInfo } from './app-ports';
import { TableData } from '../../_types/data-source.types';
import { toTableData } from '../../_utils/table.utils';

/** A data source with all of its rows (e.g. a snapshot embedded in an exported app). */
export interface DataSourceSnapshot {
  id: number;
  name: string;
  columns: string[];
  rows: string[][];
  /** The rows' ids, in order (exports before live data have none: rows are known by position). */
  rowIds?: string[];
  /** "embedded": the rows are here; "live": they come from the data API (see LiveData in the definition). */
  mode?: 'embedded' | 'live';
  keyColumn?: string | null;
  readOnly?: boolean;
}

/**
 * AppData over data held in memory: a snapshot to start from, changed in place. `onChange` is
 * told about every change (e.g. to keep it in the browser's storage).
 */
export class MemoryAppData implements AppData {
  private readonly tables = signal<Record<number, { name: string; data: TableData; readOnly?: boolean }>>({});
  private nextRowNumber = 0;

  readonly loaded = signal(true).asReadonly();
  readonly sources = computed<DataSourceInfo[]>(() =>
    Object.entries(this.tables()).map(([id, t]) => ({
      id: Number(id),
      name: t.name,
      columns: t.data.columns,
      rowCount: t.data.rows.length,
      ...(t.readOnly ? { readOnly: true } : {}),
    })),
  );

  constructor(
    snapshot: DataSourceSnapshot[],
    private readonly onChange?: (tables: Record<number, TableData>) => void,
  ) {
    this.tables.set(Object.fromEntries(snapshot.map((s) => [s.id, { name: s.name, data: toTableData(s), readOnly: s.readOnly }])));
  }

  /** Replaces a data source's rows (e.g. with ones kept from an earlier visit). */
  restore(dataSourceId: number, data: TableData): void {
    this.tables.update((all) => (all[dataSourceId] ? { ...all, [dataSourceId]: { ...all[dataSourceId], data } } : all));
  }

  table(dataSourceId: number): TableData | null {
    return this.tables()[dataSourceId]?.data ?? null;
  }

  ensureTable(): void {
    // Everything is in memory already
  }

  async loadTable(dataSourceId: number): Promise<TableData> {
    const table = this.table(dataSourceId);
    if (!table) throw new Error(`There is no data source ${dataSourceId}`);
    return table;
  }

  async addRow(dataSourceId: number, values: string[]): Promise<void> {
    // Unique also next to rows added on an earlier visit (kept in the browser)
    const id = `new-${Date.now().toString(36)}-${++this.nextRowNumber}`;
    this.change(dataSourceId, (t) => ({ ...t, rows: [...t.rows, { id, values }] }));
  }

  async updateRow(dataSourceId: number, rowId: string, values: string[]): Promise<void> {
    this.change(dataSourceId, (t) => ({ ...t, rows: t.rows.map((r) => (r.id === rowId ? { ...r, values } : r)) }));
  }

  async deleteRows(dataSourceId: number, rowIds: string[]): Promise<void> {
    this.change(dataSourceId, (t) => ({ ...t, rows: t.rows.filter((r) => !rowIds.includes(r.id)) }));
  }

  private change(dataSourceId: number, update: (table: TableData) => TableData): void {
    if (!this.tables()[dataSourceId]) return;
    this.tables.update((all) => ({ ...all, [dataSourceId]: { ...all[dataSourceId], data: update(all[dataSourceId].data) } }));
    this.onChange?.(Object.fromEntries(Object.entries(this.tables()).map(([id, t]) => [id, t.data])));
  }
}
