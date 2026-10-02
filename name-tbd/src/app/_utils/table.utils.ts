import { TableData } from '../_types/data-source.types';
import { parseJsonList } from './widget-props.utils';

// The data table widget's rules, shared by the widget and its settings.
// The backend's export applies the same rules (TableRenderer.java).

/** The chosen column names, stored as a JSON array; anything else counts as none chosen. */
export const parseColumnList = parseJsonList;

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

/** Whether a row matches a search: every word of it appears in one of the values, ignoring case. An empty search matches all. */
export function rowMatches(values: string[], query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = values.map((v) => v.toLowerCase());
  return words.every((word) => text.some((value) => value.includes(word)));
}
