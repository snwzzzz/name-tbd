import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDownload, LucideKeyboard, LucideMoon, LucideSearch, LucideSun } from '@lucide/angular';
import { ThemeService } from '../../_services/theme.service';
import { appExportUrl } from '../../_constants/api.constants';
import { EditorContext } from '../../_services/editor-context.service';
import { HttpActivityService } from '../../_services/http-activity.service';
import { ModalService } from '../../_services/modal/modal.service';
import { ShortcutsModal } from '../../components/shortcuts-modal/shortcuts-modal';
import { UserMenu } from '../../components/user-menu/user-menu';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, LucideMoon, LucideSun, LucideDownload, LucideSearch, LucideKeyboard, UserMenu],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private readonly theme = inject(ThemeService);
  private readonly modal = inject(ModalService);
  private readonly context = inject(EditorContext);

  /** The application being edited. */
  readonly appTitle = computed(() => this.context.app()?.title ?? '');

  /** Something is loading or saving (shown as a small spinner). */
  readonly busy = inject(HttpActivityService).busy;

  readonly isDark = this.theme.isDark;

  showShortcuts(): void {
    this.modal.open(ShortcutsModal, { width: '440px', ariaLabel: 'Keyboard shortcuts' });
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  /** Download the whole app (all pages, the layout, workflows and data) as one HTML file that runs on its own. */
  exportApp(): void {
    window.open(appExportUrl(this.context.requireBranchId()), '_blank');
  }
}
