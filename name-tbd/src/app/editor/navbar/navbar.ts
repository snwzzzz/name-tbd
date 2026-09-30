import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDownload, LucideMoon, LucideSearch, LucideSun } from '@lucide/angular';
import { TabsService } from '../../_services/tabs.service';
import { ThemeService } from '../../_services/theme.service';
import { pageExportUrl } from '../../_constants/api.constants';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, LucideMoon, LucideSun, LucideDownload, LucideSearch],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private readonly tabs = inject(TabsService);
  private readonly theme = inject(ThemeService);

  readonly isDark = this.theme.isDark;
  readonly activeTabId = this.tabs.activeTabId;

  toggleTheme(): void {
    this.theme.toggle();
  }

  /** Download the active page as a standalone HTML file. */
  exportPage(): void {
    const pageId = this.activeTabId();
    if (pageId) window.open(pageExportUrl(pageId), '_blank');
  }
}
