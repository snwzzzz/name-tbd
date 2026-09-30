import { TableData } from '../_types/data-source.types';

// The data table widget's rules, shared by the widget and its settings.
// The backend's export applies the same rules (TableRenderer.java).

/** The chosen column names, stored as a JSON array; anything else counts as none chosen. */
export function parseColumnList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string' || value.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** Indexes of the columns to show: the chosen ones that exist, in their order; all if none are. */
export function visibleColumnIndexes(allColumns: string[], chosen: string[]): number[] {
  const indexes = [...new Set(chosen.map((name) => allColumns.indexOf(name)).filter((i) => i >= 0))];
  return indexes.length > 0 ? indexes : allColumns.map((_, i) => i);
}

/** A loaded data source as table data; rows are identified by their position. */
export function toTableData(source: { columns?: string[]; rows?: string[][] }): TableData {
  return {
    columns: source.columns ?? [],
    rows: (source.rows ?? []).map((values, index) => ({ id: String(index), values })),
  };
}
