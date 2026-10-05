import { FlowTable } from './engine';
import { displayText, isPlainObject } from './expressions/values';

// Rows as expressions see them: an object per row with a field per column, plus `_id` (the row's
// id, for updating or deleting it). Cells are text in a data source; a column whose filled cells
// are all numbers (or all true/false) gives numbers (booleans), so `row.amount > 500` works.

/** The field holding a row's id. Columns are free to be called `id`. */
export const ROW_ID = '_id';

type ColumnKind = 'number' | 'boolean' | 'text';

const NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?$/;

function columnKind(table: FlowTable, index: number): ColumnKind {
  let kind: ColumnKind | null = null;
  for (const row of table.rows) {
    const cell = row.values[index]?.trim();
    if (!cell) continue;
    const cellKind: ColumnKind = NUMBER.test(cell) ? 'number' : cell === 'true' || cell === 'false' ? 'boolean' : 'text';
    if (kind && kind !== cellKind) return 'text';
    kind = cellKind;
  }
  return kind ?? 'text';
}

function cellValue(cell: string | null | undefined, kind: ColumnKind): unknown {
  if (cell === null || cell === undefined || cell.trim() === '') return kind === 'text' ? cell ?? '' : null;
  if (kind === 'number') return Number(cell);
  if (kind === 'boolean') return cell.trim() === 'true';
  return cell;
}

/** The table's rows as objects (see above). */
export function rowObjects(table: FlowTable): Record<string, unknown>[] {
  const kinds = table.columns.map((_, i) => columnKind(table, i));
  return table.rows.map((row) => rowObject(table.columns, row, kinds));
}

/** One row as an object; `kinds` from the whole table (default: all text). */
export function rowObject(columns: string[], row: FlowTable['rows'][number], kinds?: ColumnKind[]): Record<string, unknown> {
  const object: Record<string, unknown> = { [ROW_ID]: row.id };
  columns.forEach((column, i) => {
    object[column] = cellValue(row.values[i], kinds?.[i] ?? 'text');
  });
  return object;
}

/** A row id from a value: the id itself, or a row object (its `_id`). */
export function rowIdOf(value: unknown): string {
  if (isPlainObject(value) && value[ROW_ID] !== undefined) return displayText(value[ROW_ID]);
  if (value instanceof Map && value.has(ROW_ID)) return displayText(value.get(ROW_ID));
  const id = displayText(value);
  if (!id) throw new Error('No row was given');
  return id;
}

/** Row ids from a value: one id or row, or a list of them. */
export function rowIdsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.map(rowIdOf) : [rowIdOf(value)];
}

/** The cell text for a value (numbers without float noise, objects as JSON). */
export const cellText = (value: unknown): string => displayText(value);
