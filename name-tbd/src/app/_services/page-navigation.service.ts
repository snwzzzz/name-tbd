import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TabsService } from './tabs.service';
import { PagesStateService } from './pages-state.service';
import { PreviewSessionService } from './preview-session.service';

/** Follows links to pages: opens the page's tab (adding it if needed) in edit mode. */
@Injectable({ providedIn: 'root' })
export class PageNavigationService {
  private readonly router = inject(Router);
  private readonly tabs = inject(TabsService);
  private readonly pages = inject(PagesStateService);
  private readonly preview = inject(PreviewSessionService);

  /** Opens the page; when it's followed from a preview, the preview goes on there. */
  openPage(pageId: number): void {
    const tabId = String(pageId);
    if (tabId === this.tabs.activeTabId()) return;

    if (!this.tabs.tabs().some((tab) => tab.id === tabId)) {
      const title = this.pages.page(pageId)?.name ?? `Page ${pageId}`;
      this.tabs.tabs.update((tabs) => [...tabs, { id: tabId, title, mode: 'edit' }]);
    }
    if (this.preview.active()) this.preview.continueOn(tabId);
    this.router.navigate(['/editor', tabId, 'edit']);
  }
}
