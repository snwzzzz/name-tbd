import { WidgetProps } from '../_types/layout.types';

/** A widget prop as text, or undefined when it isn't set (or empty). */
export function propText(props: WidgetProps | undefined, key: string): string | undefined {
  const value = props?.[key];
  return value == null || value === '' ? undefined : String(value);
}
