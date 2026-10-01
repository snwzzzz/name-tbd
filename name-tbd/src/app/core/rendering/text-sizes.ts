import { WidgetProps } from '../../_types/layout.types';

/**
 * The text sizes widgets offer (their "Text size" setting, options in the widget catalog), as the
 * design tokens they stand for (_styles/_tokens.scss).
 */
export const TEXT_SIZES: Record<string, string> = {
  Small: 'var(--text-size-small)',
  Normal: 'var(--text-size-normal)',
  Large: 'var(--text-size-large)',
  Title: 'var(--text-size-title)',
  Headline: 'var(--text-size-headline)',
};

/** The text size a widget's props pick, or null for the standard one. */
export function textSizeOf(props: WidgetProps): string | null {
  return TEXT_SIZES[String(props['textSize'] ?? '')] ?? null;
}
