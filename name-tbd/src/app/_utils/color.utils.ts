// Colors as the widgets' color props store them: hex text ('#0f6cbd'), or '' for "the default".

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** A typed color as '#rrggbb' (lower case; '#abc' and 'abc' are fine too), or null if it isn't one. */
export function normalizeHex(text: string): string | null {
  const match = HEX.exec(text.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? [...match[1]].map((d) => d + d).join('') : match[1];
  return `#${digits.toLowerCase()}`;
}

/** The relative luminance of a hex color (0 black … 1 white), or null if it isn't one. */
export function luminance(hex: string): number | null {
  const color = normalizeHex(hex);
  if (!color) return null;
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(color.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The contrast ratio of two colors (1 … 21; WCAG), or null if either isn't one. */
export function contrast(a: string, b: string): number | null {
  const [la, lb] = [luminance(a), luminance(b)];
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Whether light text reads better on this color than the dark text (false for anything but a hex color). */
export function isDark(hex: string): boolean {
  const light = contrast(hex, LIGHT_TEXT), dark = contrast(hex, DARK_TEXT);
  return light !== null && dark !== null && light > dark;
}

/** The widgets' main color (the editor's primary, --color-primary): buttons, links, the open page in a menu, focus rings. */
export const BRAND_COLOR = '#2f89ff';

export const LIGHT_TEXT = '#ffffff';
export const DARK_TEXT = '#242424';

/** Text that's readable on this background. */
export const readableOn = (background: string): string => (isDark(background) ? LIGHT_TEXT : DARK_TEXT);

/** A hex color mixed with another: `amount` 0 is the color, 1 the other one (null if either isn't a color). */
export function mix(hex: string, other: string, amount: number): string | null {
  const a = normalizeHex(hex), b = normalizeHex(other);
  if (!a || !b) return null;
  const channel = (c: string, i: number) => parseInt(c.slice(i, i + 2), 16);
  return '#' + [1, 3, 5]
    .map((i) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * amount).toString(16).padStart(2, '0'))
    .join('');
}

/**
 * A tone of the background that stands out on it: darker, or lighter on a near-black one (which
 * can't get darker). E.g. a filled menu's open page.
 */
export function toneOf(background: string, amount = 0.14): string {
  const l = luminance(background);
  const base = normalizeHex(background) ?? '#ffffff';
  return mix(base, l !== null && l < 0.02 ? '#ffffff' : '#000000', l !== null && l < 0.02 ? amount * 1.4 : amount)!;
}
