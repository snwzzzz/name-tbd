import { TableData } from '../../_types/data-source.types';

// What a chart shows, from a data source's rows: one value per label. Pure, so it's tested apart
// from drawing (widgets/chart-widget).

export interface ChartPoint {
  label: string;
  value: number;
}

/** How rows with the same label become one point (catalog: "Rows with the same label"). */
export type ChartCombine = 'Sum' | 'Count' | 'Average' | 'Show each';

/**
 * The points of a chart: labels from one column, values from another (or the number of rows, when
 * there's no value column). Rows whose value isn't a number count as 0. In the data's order.
 */
export function chartPoints(table: TableData, labelColumn: number, valueColumn: number, combine: ChartCombine): ChartPoint[] {
  const valueOf = (values: string[]) => (valueColumn < 0 ? 1 : toNumber(values[valueColumn]));
  const labelOf = (values: string[], index: number) => (labelColumn < 0 ? String(index + 1) : values[labelColumn] ?? '');

  if (combine === 'Show each' && valueColumn >= 0) {
    return table.rows.map((row, i) => ({ label: labelOf(row.values, i), value: valueOf(row.values) }));
  }
  const groups = new Map<string, { sum: number; count: number }>();
  table.rows.forEach((row, i) => {
    const label = labelOf(row.values, i);
    const group = groups.get(label) ?? { sum: 0, count: 0 };
    group.sum += valueOf(row.values);
    group.count += 1;
    groups.set(label, group);
  });
  return [...groups].map(([label, { sum, count }]) => ({
    label,
    value: combine === 'Count' || valueColumn < 0 ? count : combine === 'Average' ? sum / count : sum,
  }));
}

/** At most `max` points: the largest ones in their order, the rest summed up as "Other" at the end. */
export function foldSmallest(points: ChartPoint[], max: number): ChartPoint[] {
  if (points.length <= max) return points;
  const keep = new Set([...points].sort((a, b) => b.value - a.value).slice(0, max - 1));
  const other = points.filter((p) => !keep.has(p)).reduce((sum, p) => sum + p.value, 0);
  return [...points.filter((p) => keep.has(p)), { label: 'Other', value: other }];
}

/** A round step for a value axis from 0 to at least `max`, with about `ticks` gridlines. */
export function niceScale(max: number, ticks = 4): { max: number; step: number } {
  if (!(max > 0)) return { max: 1, step: 0.25 };
  const raw = max / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude;
  return { max: Math.ceil(max / step) * step, step };
}

/** A value as the chart labels it: whole numbers plain, others with up to two decimals. */
export function formatValue(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString('en-US') : value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function toNumber(text: string | undefined): number {
  const value = Number(String(text ?? '').replace(/[^\d.eE+-]/g, ''));
  return Number.isFinite(value) ? value : 0;
}
