import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeSettingsService } from '../../_services/theme-settings.service';
import { ColorField } from '../../components/color-field/color-field';
import { UiSelect } from '../../components/ui-select/ui-select';
import { SelectOption } from '../../_types/select.types';
import {
  CUSTOM_THEME, ResolvedTheme, THEME_FONTS, THEME_PRESETS, THEME_RADII, THEME_SPACINGS, presetTheme, themeVariables,
} from '../../core/rendering/app-theme';

const options = (names: string[]): SelectOption[] => names.map((name) => ({ value: name, label: name }));

/**
 * The sidebar's Theme tab: the app-wide look every widget follows (primary color, font, corners,
 * spacing). Pick one of the presets, or make a custom one from the current values. Changes show
 * on the canvas at once and are saved on the app (ThemeSettingsService).
 */
@Component({
  selector: 'app-theme-panel',
  imports: [FormsModule, ColorField, UiSelect],
  templateUrl: './theme-panel.html',
  styleUrl: './theme-panel.scss',
})
export class ThemePanel {
  readonly settings = inject(ThemeSettingsService);

  readonly presets = [...THEME_PRESETS, CUSTOM_THEME].map((name) => ({
    name,
    // Custom starts from what the app has now
    values: name === CUSTOM_THEME ? null : presetTheme(name),
  }));
  readonly fonts = options(THEME_FONTS);
  readonly radii = options(THEME_RADII);
  readonly spacings = options(THEME_SPACINGS);

  readonly current = this.settings.resolved;
  readonly isCustom = computed(() => this.current().preset === CUSTOM_THEME);
  /** The widget tokens of the current theme, for the preview. */
  readonly previewStyle = computed(() => themeVariables(this.current()));

  swatchStyle(values: ResolvedTheme | null): Record<string, string> {
    return themeVariables(values ?? { ...this.current(), preset: CUSTOM_THEME });
  }

  pickPreset(name: string): void {
    if (name === this.current().preset) return;
    // A custom theme starts as a copy of the current one
    const theme = name === CUSTOM_THEME ? { ...this.current(), preset: CUSTOM_THEME } : { preset: name };
    void this.settings.setTheme(theme);
  }

  /** Changes one value; the theme becomes a custom one. */
  change(key: 'primary' | 'font' | 'radius' | 'spacing', value: string): void {
    if (!value || value === this.current()[key]) return;
    void this.settings.setTheme({ ...this.current(), preset: CUSTOM_THEME, [key]: value });
  }
}
