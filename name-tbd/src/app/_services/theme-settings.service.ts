import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApplicationControllerService } from '../api/services/applicationController.service';
import { EditorContext } from './editor-context.service';
import { ToastService } from './toast.service';
import { AppThemeService } from '../core/services/app-theme.service';
import { AppTheme } from '../core/rendering/app-theme';

/**
 * Changing the app-wide theme (the Theme tab). A change shows at once (the canvas and every widget
 * restyle) and is saved on the application; if it can't be saved, the theme goes back.
 * Not part of undo: like page and data source changes, it isn't a change to one page.
 */
@Injectable({ providedIn: 'root' })
export class ThemeSettingsService {
  private readonly api = inject(ApplicationControllerService);
  private readonly context = inject(EditorContext);
  private readonly toasts = inject(ToastService);
  private readonly appTheme = inject(AppThemeService);

  readonly theme = this.appTheme.theme.asReadonly();
  readonly resolved = this.appTheme.resolved;
  readonly saving = signal(false);

  async setTheme(theme: AppTheme): Promise<void> {
    const appId = this.context.appId();
    if (appId === null) return;
    const before = this.appTheme.theme();
    this.appTheme.theme.set(theme);
    this.saving.set(true);
    try {
      const app = await firstValueFrom(this.api.updateApplication(appId, { theme }));
      this.context.app.set(app);
    } catch (err) {
      console.error('Failed to save the theme', err);
      this.appTheme.theme.set(before);
      this.toasts.show('The theme could not be saved.', 'warning');
    } finally {
      this.saving.set(false);
    }
  }
}
