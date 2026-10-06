import { TableRow } from '../../../app/_types/data-source.types';

// The exported app's side of the data API (DataApiController.java): its key is its only credential, so
// requests carry no cookies and work from any origin, even a file opened from disk.

/** A data source's rows as the data API answers them. */
export interface DataPage {
  columns: string[];
  rows: TableRow[];
  keyColumn?: string | null;
  readOnly?: boolean;
  truncated?: boolean;
}

/** A change's answer: the row now, and what someone else had set meanwhile (overwritten by this change). */
export interface ChangedRow {
  row: TableRow;
  conflicts: Record<string, string>;
}

/** The server can't be reached (offline, or it's down): the change can wait and be sent later. */
export class OfflineError extends Error {
  constructor() {
    super('The server can’t be reached');
    this.name = 'OfflineError';
  }
}

/** The server refused (e.g. a row deleted meanwhile, a revoked key); `status` says how. */
export class DataApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'DataApiError';
  }
}

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export class DataApiClient {
  private readonly base: string;

  constructor(apiUrl: string, private readonly key: string, private readonly fetchImpl: Fetch = (url, init) => fetch(url, init)) {
    this.base = apiUrl.replace(/\/+$/, '');
  }

  async read(sourceId: number): Promise<DataPage> {
    const page = await this.call<{ columns?: string[]; rows?: { id: string; values: string[] }[]; keyColumn?: string | null; readOnly?: boolean; truncated?: boolean }>(
      'GET', `/api/data/${sourceId}`);
    return {
      columns: page.columns ?? [],
      rows: (page.rows ?? []).map((r) => ({ id: String(r.id), values: r.values ?? [] })),
      keyColumn: page.keyColumn,
      readOnly: page.readOnly,
      truncated: page.truncated,
    };
  }

  async add(sourceId: number, values: Record<string, string>): Promise<TableRow> {
    const row = await this.call<{ id: string; values: string[] }>('POST', `/api/data/${sourceId}/rows`, { values });
    return { id: String(row.id), values: row.values ?? [] };
  }

  async change(sourceId: number, rowId: string, values: Record<string, string>, base?: Record<string, string>): Promise<ChangedRow> {
    const answer = await this.call<{ row: { id: string; values: string[] }; conflicts?: Record<string, string> }>(
      'PATCH', `/api/data/${sourceId}/rows`, { id: rowId, values, base });
    return { row: { id: String(answer.row.id), values: answer.row.values ?? [] }, conflicts: answer.conflicts ?? {} };
  }

  async delete(sourceId: number, rowIds: string[]): Promise<void> {
    await this.call('POST', `/api/data/${sourceId}/rows/delete`, { ids: rowIds });
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.base + path, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'omit',
        cache: 'no-store',
      });
    } catch {
      throw new OfflineError();
    }
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    const json = text ? safeJson(text) : null;
    if (!response.ok) {
      // A gateway in front of a stopped server answers 502/503/504: as good as offline
      if (response.status === 502 && !json?.message) throw new OfflineError();
      if (response.status === 503 || response.status === 504) throw new OfflineError();
      throw new DataApiError(json?.message ?? `The server answered ${response.status}`, response.status);
    }
    return json as T;
  }
}

function safeJson(text: string): { message?: string } | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
