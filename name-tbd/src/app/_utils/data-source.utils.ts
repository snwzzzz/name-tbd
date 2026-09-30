import { ColumnInfo, ColumnType } from '../_types/data-source.types';

const BOOLEAN_VALUES = new Set(['true', 'false', 'yes', 'no']);
// ISO-style dates, optionally with a time: 2024-01-31, 2024-01-31T12:00, 2024-01-31 12:00:00
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

const isNumber = (value: string): boolean => value !== '' && Number.isFinite(Number(value));
const isBoolean = (value: string): boolean => BOOLEAN_VALUES.has(value.toLowerCase());
const isDate = (value: string): boolean => DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value));

/**
 * The type all non-empty values of a column share ('text' if they don't agree, 'empty' if there
 * are none). Values are CSV text, so this is a best guess for display, not a schema.
 */
export function inferColumnType(values: string[]): ColumnType {
  const filled = values.map((v) => v.trim()).filter((v) => v !== '');
  if (filled.length === 0) return 'empty';
  if (filled.every(isNumber)) return 'number';
  if (filled.every(isBoolean)) return 'boolean';
  if (filled.every(isDate)) return 'date';
  return 'text';
}

/** Per column: its inferred type and how many values are filled. */
export function describeColumns(columns: string[], rows: string[][]): ColumnInfo[] {
  return columns.map((name, index) => {
    const values = rows.map((row) => row[index] ?? '');
    return {
      index,
      name,
      type: inferColumnType(values),
      filledCount: values.filter((v) => v.trim() !== '').length,
    };
  });
}
