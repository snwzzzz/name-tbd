import { ActionExecutor, FlowData, FlowFetch, FlowHost, FlowTable, FlowVariables } from './engine';
import { VariableDefinition, coerceToType, initialValue } from './expressions/values';
import { rowObjects } from './data';

// A host that keeps everything in memory: the server's sidecar runs flows on it, and the engine's
// specs and the conformance fixtures use it. The browser has its own host (signals, widgets).

/** Variables of an app and its pages: definitions plus current values. */
export class MemoryVariables implements FlowVariables {
  private readonly app = new Map<string, { definition: VariableDefinition; value: unknown }>();
  private readonly pages = new Map<string, Map<string, { definition: VariableDefinition; value: unknown }>>();

  constructor(app: VariableDefinition[] = [], pages: Record<string, VariableDefinition[]> = {}, values: Record<string, unknown> = {}) {
    for (const definition of app) this.app.set(definition.name, { definition, value: initialValue(definition) });
    for (const [pageId, definitions] of Object.entries(pages)) {
      this.pages.set(pageId, new Map(definitions.map((d) => [d.name, { definition: d, value: initialValue(d) }])));
    }
    // Values to start from instead of the initial ones (e.g. what the caller had), by name
    for (const [name, value] of Object.entries(values)) {
      const slot = this.app.get(name);
      if (slot) slot.value = coerceToType(value, slot.definition.type);
    }
  }

  get(pageId: string, name: string): unknown {
    return this.slot(pageId, name).value;
  }

  set(pageId: string, name: string, value: unknown): void {
    const slot = this.slot(pageId, name);
    try {
      slot.value = coerceToType(value, slot.definition.type);
    } catch (err) {
      throw new Error(`${name} can't take that value: ${(err as Error).message}`);
    }
  }

  /** The names a page sees: its own variables, then the app's it doesn't hide. */
  names(pageId: string): string[] {
    return [...new Set([...(this.pages.get(pageId)?.keys() ?? []), ...this.app.keys()])];
  }

  /** Every app variable's value, and every page's (by page id). */
  snapshot(): { app: Record<string, unknown>; pages: Record<string, Record<string, unknown>> } {
    return {
      app: Object.fromEntries([...this.app].map(([name, slot]) => [name, slot.value])),
      pages: Object.fromEntries([...this.pages].map(([pageId, vars]) => [pageId, Object.fromEntries([...vars].map(([n, s]) => [n, s.value]))])),
    };
  }

  private slot(pageId: string, name: string) {
    const slot = this.pages.get(pageId)?.get(name) ?? this.app.get(name);
    if (!slot) throw new Error(`There is no variable "${name}"`);
    return slot;
  }
}

/** Data sources held in memory, changed in place. */
export class MemoryData implements FlowData {
  private readonly tables = new Map<number, FlowTable & { name: string }>();
  private nextRow = 1;

  constructor(sources: { id: number; name: string; columns: string[]; rows: (string | null)[][] }[] = []) {
    for (const source of sources) {
      this.tables.set(source.id, {
        name: source.name,
        columns: source.columns,
        rows: source.rows.map((values, i) => ({ id: String(i), values })),
      });
    }
  }

  async table(dataSourceId: number): Promise<FlowTable> {
    return this.get(dataSourceId);
  }

  addRow(dataSourceId: number, values: string[]): string {
    const table = this.get(dataSourceId);
    const id = `new-${this.nextRow++}`;
    table.rows = [...table.rows, { id, values }];
    return id;
  }

  updateRow(dataSourceId: number, rowId: string, values: string[]): void {
    const table = this.get(dataSourceId);
    table.rows = table.rows.map((r) => (r.id === rowId ? { ...r, values } : r));
  }

  deleteRows(dataSourceId: number, rowIds: string[]): void {
    const table = this.get(dataSourceId);
    table.rows = table.rows.filter((r) => !rowIds.includes(r.id));
  }

  /** Every data source with its rows (as values only, in order). */
  snapshot(): { id: number; name: string; columns: string[]; rows: (string | null)[][] }[] {
    return [...this.tables].map(([id, t]) => ({ id, name: t.name, columns: t.columns, rows: t.rows.map((r) => r.values) }));
  }

  /** Rows as objects by data source name (like `data.orders` in expressions). */
  rowsByName(): Record<string, Record<string, unknown>[]> {
    return Object.fromEntries([...this.tables.values()].map((t) => [t.name, rowObjects(t)]));
  }

  private get(dataSourceId: number) {
    const table = this.tables.get(dataSourceId);
    if (!table) throw new Error(`There is no data source ${dataSourceId}`);
    return table;
  }
}

export interface MemoryHostOptions {
  variables?: MemoryVariables;
  data?: MemoryData;
  fetch?: FlowFetch;
  /** More names for expressions, e.g. `params` (read when an expression runs). */
  scope?: (pageId: string) => Record<string, unknown>;
  actions?: Record<string, ActionExecutor>;
}

/**
 * A host over memory. Expressions see the page's variables by name, `data` (every data source's
 * rows by name) and whatever `scope` adds.
 */
export function memoryHost(options: MemoryHostOptions = {}): FlowHost & { variables: MemoryVariables; data: MemoryData } {
  const variables = options.variables ?? new MemoryVariables();
  const data = options.data ?? new MemoryData();
  return {
    variables,
    data,
    fetch: options.fetch,
    action: (type) => options.actions?.[type],
    scope: (pageId) => {
      const scope: Record<string, unknown> = {};
      for (const name of variables.names(pageId)) {
        Object.defineProperty(scope, name, { get: () => variables.get(pageId, name), enumerable: true });
      }
      Object.defineProperty(scope, 'data', { get: () => data.rowsByName(), enumerable: true });
      Object.assign(scope, options.scope?.(pageId));
      return scope;
    },
  };
}
