import { Injectable, computed, signal } from '@angular/core';
import { AppTheme, resolveTheme, themeVariables } from '../rendering/app-theme';

/**
 * The app's theme, for code that needs its values (e.g. the nav menu working out colors that read
 * well on the primary). The host sets it: the exported app from its definition, the editor from
 * the application being edited. CSS reads the same theme through themeVariables().
 */
@Injectable({ providedIn: 'root' })
export class AppThemeService {
  readonly theme = signal<AppTheme | null>(null);
  readonly resolved = computed(() => resolveTheme(this.theme()));
  readonly variables = computed(() => themeVariables(this.theme()));
}
