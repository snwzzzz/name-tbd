import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDownload, LucideKeyboard, LucideMoon, LucideSearch, LucideSun } from '@lucide/angular';
import { TabsService } from '../../_services/tabs.service';
import { ThemeService } from '../../_services/theme.service';
import { pageExportUrl } from '../../_constants/api.constants';
import { HttpActivityService } from '../../_services/http-activity.service';
import { ModalService } from '../../_services/modal/modal.service';
import { ShortcutsModal } from '../../components/shortcuts-modal/shortcuts-modal';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, LucideMoon, LucideSun, LucideDownload, LucideSearch, LucideKeyboard],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private readonly tabs = inject(TabsService);
  private readonly theme = inject(ThemeService);
  private readonly modal = inject(ModalService);

  /** Something is loading or saving (shown as a small spinner). */
  readonly busy = inject(HttpActivityService).busy;

  readonly isDark = this.theme.isDark;
  readonly activeTabId = this.tabs.activeTabId;

  showShortcuts(): void {
    this.modal.open(ShortcutsModal, { width: '440px', ariaLabel: 'Keyboard shortcuts' });
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  /** Download the active page as a standalone HTML file. */
  exportPage(): void {
    const pageId = this.activeTabId();
    if (pageId) window.open(pageExportUrl(pageId), '_blank');
  }
}
