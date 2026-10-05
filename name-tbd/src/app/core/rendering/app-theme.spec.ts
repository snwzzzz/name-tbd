import { CUSTOM_THEME, THEME_PRESETS, resolveTheme, themeVariables } from './app-theme';

describe('app theme', () => {
  it('has three presets besides a custom theme', () => {
    expect(THEME_PRESETS).toEqual(['Default', 'Fresh', 'Elegant']);
  });

  it("takes a preset's values, and the default preset's for no theme or an unknown one", () => {
    expect(resolveTheme(null)).toEqual({ preset: 'Default', primary: '#2f89ff', font: 'Segoe UI', radius: 'Small', spacing: 'Normal' });
    expect(resolveTheme({ preset: 'Fresh', primary: '#000000' }).primary).toBe('#0f8a4f');
    expect(resolveTheme({ preset: 'Nope' }).preset).toBe('Default');
  });

  it("takes a custom theme's own values where they're valid", () => {
    expect(resolveTheme({ preset: CUSTOM_THEME, primary: '#AA0000', font: 'Mono', radius: 'Bogus' })).toEqual({
      preset: 'Custom', primary: '#aa0000', font: 'Mono', radius: 'Small', spacing: 'Normal',
    });
  });

  it('sets the widget tokens', () => {
    const vars = themeVariables({ preset: 'Elegant' });
    expect(vars['--widget-brand']).toBe('#6d3bd8');
    expect(vars['--widget-font']).toContain('Georgia');
    expect(vars['--widget-radius']).toBe('8px');
    expect(vars['--widget-space']).toBe('0.5rem');
  });
});
