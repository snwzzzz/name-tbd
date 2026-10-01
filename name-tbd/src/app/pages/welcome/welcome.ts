import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { LucideDatabase, LucideFile, LucideFolderOpen, LucideLayoutTemplate, LucidePanelsTopLeft } from '@lucide/angular';
import { PageControllerService } from '../../api/services/pageController.service';
import { TabsService } from '../../_services/tabs.service';
import { PageNavigationService } from '../../_services/page-navigation.service';
import { ModalService } from '../../_services/modal/modal.service';
import { PagesStateService } from '../../_services/pages-state.service';
import { panelTab } from '../../_constants/sidebar-tabs.constants';
import { CreatePageModal, CreatePageResult } from './create-page-modal/create-page-modal';
import { PagePickerData, PagePickerModal } from './page-picker-modal/page-picker-modal';
import { RecentPagesService } from '../../_services/recent-pages.service';
import { PageDto } from '../../api/models';
import { timeAgo } from '../../_utils/time.utils';
import { EDITOR_BRANCH_ID } from '../../_constants/api.constants';

/** Pages are not split by branch yet; everything lives on this one. */
/** How many pages the Start tab lists. */
const RECENT_PAGES_SHOWN = 5;
/** The layout page made by the "Layout page" quick action, when there's none yet. */
const NEW_LAYOUT_PAGE = { name: 'Layout', path: '/layout' };

interface RecentPageRow {
  page: PageDto;
  /** e.g. "2 h ago"; '—' for pages not opened yet (shown to fill the list). */
  lastOpened: string;
}

/** The Start tab: build or open a page, manage data, jump to the layout page and to recent pages. */
@Component({
  selector: 'app-welcome',
  imports: [LucideLayoutTemplate, LucideFolderOpen, LucidePanelsTopLeft, LucideDatabase, LucideFile],
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
})
export class Welcome implements OnInit {
  private readonly pageService = inject(PageControllerService);
  private readonly tabs = inject(TabsService);
  private readonly modalService = inject(ModalService);
  private readonly pagesState = inject(PagesStateService);
  private readonly navigation = inject(PageNavigationService);
  private readonly recentPages = inject(RecentPagesService);

  /** The project's pages (shared with links and the layout layer, so they stay in sync). */
  readonly pages = this.pagesState.pages;
  readonly pagesLoaded = this.pagesState.loaded;
  readonly layoutPage = this.pagesState.layoutPage;
  /** While the layout page is being created by the quick action. */
  readonly creatingLayout = signal(false);

  /** The last opened pages (newest first), filled up with other pages; at most RECENT_PAGES_SHOWN. */
  readonly recentRows = computed<RecentPageRow[]>(() => {
    const pages = this.pages();
    const recent = this.recentPages.recent()
      .map((r) => ({ page: pages.find((p) => p.id === r.pageId), lastOpened: timeAgo(r.openedAt) }))
      .filter((row): row is RecentPageRow => !!row.page);
    const others = pages
      .filter((p) => !recent.some((row) => row.page.id === p.id))
      .map((page) => ({ page, lastOpened: '—' }));
    return [...recent, ...others].slice(0, RECENT_PAGES_SHOWN);
  });

  ngOnInit(): void {
    this.pagesState.refresh();
  }

  openCreatePageModal(): void {
    this.modalService
      .open<CreatePageModal, undefined, CreatePageResult>(CreatePageModal, { width: '440px', ariaLabel: 'Create New Page' })
      .afterClosed()
      .subscribe((result) => {
        if (result) this.createPage(result);
      });
  }

  /** Picks any page to open, in a searchable list. */
  openPagePicker(): void {
    this.modalService
      .open<PagePickerModal, PagePickerData, number>(PagePickerModal, {
        data: { pages: this.pages() },
        width: '480px',
        ariaLabel: 'Open a page',
      })
      .afterClosed()
      .subscribe((id) => {
        if (id !== undefined) this.openPage(id);
      });
  }

  /** Opens the layout page, creating it first if the app has none yet. */
  openOrCreateLayoutPage(): void {
    const layout = this.layoutPage();
    if (layout?.id != null) {
      this.openPage(layout.id);
      return;
    }
    if (this.creatingLayout()) return;
    this.creatingLayout.set(true);
    this.pageService.createPage({ branchId: EDITOR_BRANCH_ID, ...NEW_LAYOUT_PAGE, layout: true }).subscribe({
      next: (page) => {
        this.creatingLayout.set(false);
        this.pagesState.refresh();
        this.openPage(page.id!);
      },
      error: (err) => {
        this.creatingLayout.set(false);
        console.error('Failed to create the layout page', err);
      },
    });
  }

  /** The Data panel as a tab of its own, to manage data sources with room to spare. */
  manageData(): void {
    this.tabs.openPanel('data', panelTab('data')?.label ?? 'Data');
  }

  /** Opens the page in its own tab (or switches to it); the Start tab stays. */
  openPage(id: number): void {
    this.navigation.openPage(id);
  }

  private createPage({ name, path, layout }: CreatePageResult): void {
    this.pageService.createPage({ branchId: EDITOR_BRANCH_ID, name, path, layout }).subscribe((page) => {
      // The pages list, links and the layout layer pick up the new page
      this.pagesState.refresh();
      this.openPage(page.id!);
    });
  }
}
