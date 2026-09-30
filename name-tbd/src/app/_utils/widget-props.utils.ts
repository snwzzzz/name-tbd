import { WidgetProps } from '../_types/layout.types';

/** A widget prop as text, or undefined when it isn't set (or empty). */
export function propText(props: WidgetProps | undefined, key: string): string | undefined {
  const value = props?.[key];
  return value == null || value === '' ? undefined : String(value);
}

/** A boolean prop; props loaded from the backend are text, so 'true' counts as true. */
export function propBool(props: WidgetProps | undefined, key: string, fallback: boolean): boolean {
  const value = props?.[key];
  if (typeof value === 'boolean') return value;
  const text = propText(props, key);
  return text === undefined ? fallback : text.trim() === 'true';
}

/** A number prop, or the fallback when it isn't a number. */
export function propNumber(props: WidgetProps | undefined, key: string, fallback: number): number {
  const text = propText(props, key);
  const value = text === undefined ? NaN : Number(text);
  return Number.isFinite(value) ? value : fallback;
}
