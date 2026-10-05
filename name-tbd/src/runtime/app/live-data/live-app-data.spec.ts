import { LiveAppData } from './live-app-data';
import { DataApiClient } from './data-api-client';
import { MemoryOfflineStore, OfflineStore } from './offline-store';
import { DataSourceSnapshot } from '../../../app/core/ports/memory-app-data';

/**
 * A data API in memory, shared by every "browser" that uses it, like the server's: rows by id, changes
 * by column, and conflicts when a change was made on values that changed meanwhile. `online` switches the
 * network off for everyone.
 */
class FakeServer {
  online = true;
  private nextId = 3;
  rows: { id: string; values: string[] }[] = [
    { id: '1', values: ['Ada', '750'] },
    { id: '2', values: ['Bob', '20'] },
  ];
  readonly columns = ['customer', 'amount'];

  fetch = async (url: string, init: RequestInit): Promise<Response> => {
    if (!this.online) throw new TypeError('Failed to fetch');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer ntbd_ak_test');
    expect(init.credentials).toBe('omit');
    const body = init.body ? JSON.parse(init.body as string) : null;
    const path = new URL(url).pathname;
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

    if (init.method === 'GET' && path === '/api/data/7') return json({ columns: this.columns, rows: this.rows });
    if (init.method === 'POST' && path === '/api/data/7/rows') {
      const row = { id: String(this.nextId++), values: this.columns.map((c) => body.values[c] ?? '') };
      this.rows.push(row);
      return json(row, 201);
    }
    if (init.method === 'PATCH' && path === '/api/data/7/rows') {
      const row = this.rows.find((r) => r.id === body.id);
      if (!row) return json({ message: `There is no row ${body.id} (it may have been deleted)` }, 404);
      const conflicts: Record<string, string> = {};
      for (const [column, was] of Object.entries<string>(body.base ?? {})) {
        const now = row.values[this.columns.indexOf(column)];
        if (now !== was && now !== body.values[column]) conflicts[column] = now;
      }
      for (const [column, value] of Object.entries<string>(body.values)) row.values[this.columns.indexOf(column)] = value;
      return json({ row, conflicts });
    }
    if (init.method === 'POST' && path === '/api/data/7/rows/delete') {
      this.rows = this.rows.filter((r) => !body.ids.includes(r.id));
      return new Response(null, { status: 204 });
    }
    return json({ message: 'unexpected' }, 400);
  };
}

const SOURCES: DataSourceSnapshot[] = [{ id: 7, name: 'orders', columns: ['customer', 'amount'], rows: [], mode: 'live' }];

function browser(server: FakeServer, store: OfflineStore | null, notify = vi.fn()) {
  const data = new LiveAppData({
    sources: SOURCES,
    client: new DataApiClient('https://app.example.com/', 'ntbd_ak_test', server.fetch),
    store: store ? Promise.resolve(store) : null,
    notify,
    events: null,
  });
  return { data, notify };
}

const customers = (data: LiveAppData) => data.table(7)?.rows.map((r) => r.values[0]);

describe('LiveAppData', () => {
  it('reads and changes the server’s rows, and two browsers see each other’s changes on their next read', async () => {
    const server = new FakeServer();
    const a = browser(server, null).data;
    const b = browser(server, null).data;

    await a.loadTable(7);
    await a.addRow(7, ['Cleo', '5']);
    expect(a.table(7)!.rows.at(-1)).toEqual({ id: '3', values: ['Cleo', '5'] });

    await b.loadTable(7);
    expect(customers(b)).toEqual(['Ada', 'Bob', 'Cleo']);

    await b.updateRow(7, '3', ['Cleo', '6']);
    await b.deleteRows(7, ['1']);
    await a.refresh(7);
    expect(a.table(7)!.rows).toEqual([{ id: '2', values: ['Bob', '20'] }, { id: '3', values: ['Cleo', '6'] }]);
  });

  it('tells the user when a change overwrote someone else’s', async () => {
    const server = new FakeServer();
    const a = browser(server, null);
    const b = browser(server, null);
    await a.data.loadTable(7);
    await b.data.loadTable(7);

    await b.data.updateRow(7, '2', ['Bob', '25']);
    // A still sees 20, and changes it to 30: A wins, and hears it overwrote 25
    await a.data.updateRow(7, '2', ['Bob', '30']);

    expect(server.rows[1].values).toEqual(['Bob', '30']);
    expect(a.data.sync!().conflicts).toEqual([expect.objectContaining({ dataSourceId: 7, rowId: '2', overwritten: { amount: '25' } })]);
    expect(a.notify).toHaveBeenCalledWith(expect.stringContaining('amount was “25”'), 'warning');
    a.data.dismissConflicts!();
    expect(a.data.sync!().conflicts).toEqual([]);
  });

  it('with an offline cache, works offline and sends its changes once back online', async () => {
    const server = new FakeServer();
    const store = new MemoryOfflineStore();
    const first = browser(server, store).data;
    await first.loadTable(7);

    // Offline: the page is opened again, from what was kept
    server.online = false;
    const offline = browser(server, store).data;
    await offline.loadTable(7);
    expect(customers(offline)).toEqual(['Ada', 'Bob']);
    expect(offline.sync!().online).toBe(false);

    await offline.addRow(7, ['Dana', '40']);
    const dana = offline.table(7)!.rows.at(-1)!.id;
    await offline.updateRow(7, dana, ['Dana', '45']);
    await offline.updateRow(7, '1', ['Ada', '800']);
    await offline.deleteRows(7, ['2']);
    expect(customers(offline)).toEqual(['Ada', 'Dana']);
    expect(offline.sync!().pending).toBe(4);
    expect(server.rows.map((r) => r.values[0])).toEqual(['Ada', 'Bob']);

    // Back online: the waiting changes go out in order, the new row's later change by its real id
    server.online = true;
    await offline.replay();
    expect(offline.sync!().pending).toBe(0);
    expect(server.rows).toEqual([{ id: '1', values: ['Ada', '800'] }, { id: '3', values: ['Dana', '45'] }]);
    expect(offline.table(7)!.rows.map((r) => r.id)).toEqual(['1', '3']);

    // And they were kept for the next visit too: nothing waits any more
    expect((await store.load())!.queue).toEqual([]);
  });

  it('reports offline changes the server refuses afterwards (e.g. a row deleted meanwhile), and drops them', async () => {
    const server = new FakeServer();
    const store = new MemoryOfflineStore();
    const a = browser(server, store);
    await a.data.loadTable(7);

    server.online = false;
    await a.data.updateRow(7, '2', ['Bob', '99']);
    server.online = true;
    server.rows = server.rows.filter((r) => r.id !== '2');

    await a.data.replay();
    expect(a.data.sync!().pending).toBe(0);
    expect(a.data.sync!().error).toContain('There is no row 2');
    expect(a.notify).toHaveBeenCalledWith(expect.stringContaining('couldn’t be saved'), 'warning');
  });

  it('without a cache (live only), a change made offline fails and is undone', async () => {
    const server = new FakeServer();
    const live = browser(server, null).data;
    await live.loadTable(7);

    server.online = false;
    await expect(live.addRow(7, ['Eve', '1'])).rejects.toThrow('offline');
    expect(customers(live)).toEqual(['Ada', 'Bob']);
  });

  it('a read-only data source can’t be changed', async () => {
    const live = new LiveAppData({
      sources: [{ ...SOURCES[0], readOnly: true }],
      client: new DataApiClient('https://app.example.com', 'ntbd_ak_test', new FakeServer().fetch),
      store: null,
      events: null,
    });
    await expect(live.addRow(7, ['x', '1'])).rejects.toThrow('only be read');
    expect(live.sources()[0]).toEqual(expect.objectContaining({ live: true, readOnly: true }));
  });
});
