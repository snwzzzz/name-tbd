import { TableData } from '../../_types/data-source.types';
import { ROW_ID, displayText, fromCel, isPlainObject } from '../../../flow-engine';
import { WidgetProps } from '../../_types/layout.types';

/**
 * A list of objects (e.g. what an HTTP request returned) as a table: a column per field (in the
 * order they first appear), a row per item. A list of plain values gets one column, "value".
 * Rows keep an `_id` they have, else they're numbered.
 */
export function listTableData(value: unknown): TableData {
  const items = fromCel(value);
  if (!Array.isArray(items)) return { columns: [], rows: [] };
  const objects = items.every((item) => isPlainObject(item));
  if (!objects) {
    return { columns: ['value'], rows: items.map((item, i) => ({ id: String(i), values: [displayText(item)] })) };
  }
  const columns: string[] = [];
  for (const item of items as Record<string, unknown>[]) {
    for (const key of Object.keys(item)) if (key !== ROW_ID && !columns.includes(key)) columns.push(key);
  }
  return {
    columns,
    rows: (items as Record<string, unknown>[]).map((item, i) => ({
      id: item[ROW_ID] != null ? displayText(item[ROW_ID]) : String(i),
      values: columns.map((c) => displayText(item[c])),
    })),
  };
}

/** The prop a table or list can take its rows from instead of a data source (a template, e.g. `{{ users }}`). */
export const ITEMS_PROP = 'items';

/** The rows a widget's resolved `items` prop holds (JSON text, as resolved props are text), or null without one. */
export function itemsTableData(props: WidgetProps): TableData | null {
  const items = props[ITEMS_PROP];
  if (items === undefined || items === null || items === '') return null;
  if (typeof items !== 'string') return listTableData(items);
  try {
    return listTableData(JSON.parse(items));
  } catch {
    return { columns: [], rows: [] };
  }
}
