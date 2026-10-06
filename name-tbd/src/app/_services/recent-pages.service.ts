import { Injectable, effect, inject } from '@angular/core';
import { TabsService } from './tabs.service';
import { isPageMode } from '../_types/tab.types';
import { persistedSignal } from '../_utils/storage.utils';
import { EditorContext } from './editor-context.service';

/** When a page was last opened. */
export interface RecentPage {
  pageId: number;
  openedAt: number;
}

const MAX_REMEMBERED = 20;

const isRecentList = (value: unknown): value is RecentPage[] =>
  Array.isArray(value) &&
  value.every((v) => typeof v?.pageId === 'number' && typeof v?.openedAt === 'number');

/** The pages opened most recently (newest first), noticed from the tabs and kept across reloads (per application). */
@Injectable({ providedIn: 'root' })
export class RecentPagesService {
  private readonly tabs = inject(TabsService);

  readonly recent = persistedSignal<RecentPage[]>(inject(EditorContext).storageKey('recent-pages'), [], isRecentList);

  constructor() {
    // A page tab became the active one: it's the most recent page now
    effect(() => {
      const tabId = this.tabs.activeTabId();
      const pageId = Number(tabId);
      if (tabId && isPageMode(this.tabs.activeMode()) && Number.isInteger(pageId)) this.opened(pageId);
    });
  }

  opened(pageId: number, at = Date.now()): void {
    this.recent.update((list) => [{ pageId, openedAt: at }, ...list.filter((r) => r.pageId !== pageId)].slice(0, MAX_REMEMBERED));
  }
}
