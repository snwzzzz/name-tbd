// The app-wide theme (shared/app-themes.json at the repository root, which the backend reads too):
// a preset, or 'Custom' with its own primary color, font, corners and spacing. Widgets never pick
// these themselves: they read the widget tokens (_styles/_tokens.scss), and themeVariables() sets
// those on the canvas's artboard and on the exported app's page.
import themesJson from '../../../../../shared/app-themes.json';

/** A theme as an application stores it (every field optional: missing ones come from the preset). */
export interface AppTheme {
  preset?: string;
  primary?: string;
  font?: string;
  radius?: string;
  spacing?: string;
}

/** A theme with every value decided. */
export interface ResolvedTheme {
  preset: string;
  primary: string;
  font: string;
  radius: string;
  spacing: string;
}

interface ThemesFile {
  fonts: Record<string, string>;
  radii: Record<string, { radius: string; field: string }>;
  spacings: Record<string, string>;
  presets: Record<string, Omit<ResolvedTheme, 'preset'>>;
}

const THEMES = themesJson as ThemesFile;

export const DEFAULT_THEME_PRESET = 'Default';
export const CUSTOM_THEME = 'Custom';
export const THEME_PRESETS = Object.keys(THEMES.presets);
export const THEME_FONTS = Object.keys(THEMES.fonts);
export const THEME_RADII = Object.keys(THEMES.radii);
export const THEME_SPACINGS = Object.keys(THEMES.spacings);

const HEX = /^#[0-9a-f]{6}$/i;

/** Every value of a theme: a preset's, or a custom theme's own (the default preset's where it has none or an unknown one). */
export function resolveTheme(theme: AppTheme | null | undefined): ResolvedTheme {
  const presetName = theme?.preset && THEMES.presets[theme.preset] ? theme.preset : theme?.preset === CUSTOM_THEME ? CUSTOM_THEME : DEFAULT_THEME_PRESET;
  const base = THEMES.presets[presetName] ?? THEMES.presets[DEFAULT_THEME_PRESET];
  if (presetName !== CUSTOM_THEME) return { preset: presetName, ...base };
  return {
    preset: CUSTOM_THEME,
    primary: theme?.primary && HEX.test(theme.primary) ? theme.primary.toLowerCase() : base.primary,
    font: theme?.font && THEMES.fonts[theme.font] ? theme.font : base.font,
    radius: theme?.radius && THEMES.radii[theme.radius] ? theme.radius : base.radius,
    spacing: theme?.spacing && THEMES.spacings[theme.spacing] ? theme.spacing : base.spacing,
  };
}

/** The values a preset gives (for the editor's preset picker). */
export function presetTheme(preset: string): ResolvedTheme {
  return resolveTheme({ preset });
}

/** The widget tokens a theme sets, as CSS custom properties. */
export function themeVariables(theme: AppTheme | null | undefined): Record<string, string> {
  const resolved = resolveTheme(theme);
  const radius = THEMES.radii[resolved.radius];
  return {
    '--widget-brand': resolved.primary,
    '--widget-brand-selected-bg': `color-mix(in srgb, ${resolved.primary} 12%, var(--widget-bg))`,
    '--widget-font': THEMES.fonts[resolved.font],
    '--widget-radius': radius.radius,
    '--widget-radius-field': radius.field,
    '--widget-space': THEMES.spacings[resolved.spacing],
  };
}
