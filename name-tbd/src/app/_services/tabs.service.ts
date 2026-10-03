import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { NavigationBehaviorOptions, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { EditorMode, TabItem, isPageMode } from '../_types/tab.types';
import { PagesStateService } from './pages-state.service';
import { EditorContext } from './editor-context.service';

/** Saved per application (see EditorContext.storageKey). */
const STORAGE_KEY = 'editor-tabs';
const EDITOR_MODES: EditorMode[] = ['welcome', 'edit', 'workflow', 'data', 'panel'];
/** What the Start tab is called (its mode is 'welcome'). */
export const START_TAB_TITLE = 'Start';
const WELCOME_TAB: TabItem = { id: 'welcome-0', title: START_TAB_TITLE, mode: 'welcome' };

/**
 * Every navigation within the editor keeps the URL's query parameters: they hold editor-wide
 * state, like the data source open in the sidebar (`?dataSource=…`), which switching tab or
 * mode must not reset.
 */
export const EDITOR_NAVIGATION: NavigationBehaviorOptions & { queryParamsHandling: 'preserve' } = {
  queryParamsHandling: 'preserve',
};

const isEditorMode = (value: string | undefined): value is EditorMode =>
  EDITOR_MODES.includes(value as EditorMode);

/** What a tab shows, told by its id: `welcome-…`/`new-…` Start, `panel-…` a panel, a number a page. */
export type TabKind = 'start' | 'panel' | 'page';

export function tabKind(id: string): TabKind | null {
  if (/^(welcome|new)-/.test(id)) return 'start';
  if (id.startsWith('panel-')) return 'panel';
  return /^\d+$/.test(id) ? 'page' : null;
}

/** Whether a mode fits a kind of tab (a page can't be shown as Start, nor Start as a page). */
function fits(kind: TabKind, mode: EditorMode): boolean {
  if (kind === 'start') return mode === 'welcome';
  if (kind === 'panel') return mode === 'panel';
  return isPageMode(mode);
}

/** The mode a kind of tab opens in. */
const defaultMode = (kind: TabKind): EditorMode => (kind === 'start' ? 'welcome' : kind === 'panel' ? 'panel' : 'edit');

/**
 * The editor's open tabs. The URL (`/apps/:appId/edit/:tabId/:mode`) is the source of truth for
 * the active tab and mode; the tab list itself is kept in sessionStorage, per application. A URL for a page or panel
 * that isn't open opens its tab, and a mode that doesn't fit a tab is corrected.
 */
@Injectable({ providedIn: 'root' })
export class TabsService {
  private readonly router = inject(Router);
  private readonly pages = inject(PagesStateService);
  private readonly context = inject(EditorContext);
  private readonly storageKey = this.context.storageKey(STORAGE_KEY);

  readonly tabs = signal<TabItem[]>([]);
  readonly activeTabId = signal<string | null>(null);
  readonly activeMode = signal<EditorMode>('edit');

  constructor() {
    this.tabs.set(this.restoreTabs());

    effect(() => sessionStorage.setItem(this.storageKey, JSON.stringify(this.tabs())));

    // Page tabs are titled after their page (also once the pages have loaded, or a page is renamed)
    this.pages.ensureLoaded();
    effect(() => {
      const pages = this.pages.pages();
      const tabs = untracked(this.tabs);
      const renamed = tabs.map((tab) => {
        const page = tabKind(tab.id) === 'page' ? pages.find((p) => String(p.id) === tab.id) : undefined;
        return page?.name && page.name !== tab.title ? { ...tab, title: page.name } : tab;
      });
      if (renamed.some((tab, i) => tab !== tabs[i])) this.tabs.set(renamed);
    });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.readStateFromUrl());
    setTimeout(() => this.readStateFromUrl(), 0);
  }

  addTab(): void {
    const id = `new-${this.nextTabNumber()}`;
    this.tabs.update((tabs) => [...tabs, { id, title: START_TAB_TITLE, mode: 'welcome' }]);
    this.selectTab(id);
  }

  /** Opens a sidebar panel (e.g. Data) as a tab of its own, or switches to it if it's open. */
  openPanel(panelId: string, title: string): void {
    const id = `panel-${panelId}`;
    if (!this.tabs().some((tab) => tab.id === id)) {
      this.tabs.update((tabs) => [...tabs, { id, title, mode: 'panel' }]);
    }
    this.router.navigate(this.context.path(id, 'panel'), EDITOR_NAVIGATION);
  }

  updateTabState(id: string, updates: Partial<TabItem>): void {
    this.tabs.update((tabs) => tabs.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }

  /** Closes a tab; closing the last one leaves a fresh Start tab. */
  closeTab(id: string): void {
    const wasActive = this.activeTabId() === id;
    this.tabs.update((tabs) => tabs.filter((tab) => tab.id !== id));

    if (this.tabs().length === 0) {
      this.tabs.set([WELCOME_TAB]);
      this.selectTab(WELCOME_TAB.id);
    } else if (wasActive) {
      this.selectTab(this.tabs()[0].id);
    }
  }

  /** Open a tab in the mode it was last used in. */
  selectTab(id: string): void {
    const tab = this.tabs().find((t) => t.id === id);
    const kind = tabKind(id);
    const mode = tab?.mode && (!kind || fits(kind, tab.mode)) ? tab.mode : defaultMode(kind ?? 'page');
    this.router.navigate(this.context.path(id, mode), EDITOR_NAVIGATION);
  }

  /** Switch the active tab to another mode (only pages have modes to switch between). */
  setMode(mode: EditorMode): void {
    const tabId = this.activeTabId();
    const kind = tabId ? tabKind(tabId) : null;
    if (tabId && (!kind || fits(kind, mode))) this.router.navigate(this.context.path(tabId, mode), EDITOR_NAVIGATION);
  }

  reorderTabs(previousIndex: number, currentIndex: number): void {
    this.tabs.update((tabs) => {
      const reordered = [...tabs];
      const [moved] = reordered.splice(previousIndex, 1);
      reordered.splice(currentIndex, 0, moved);
      return reordered;
    });
  }

  private restoreTabs(): TabItem[] {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(this.storageKey) ?? 'null');
      if (Array.isArray(saved) && saved.length > 0) {
        return (saved as TabItem[]).map((tab) => {
          const kind = tabKind(tab.id);
          // Start tabs saved when they were still called "Welcome"
          if (kind === 'start') return { ...tab, title: START_TAB_TITLE, mode: 'welcome' };
          // Modes that don't fit (e.g. a page tab saved as Start by an older version)
          return kind && tab.mode && !fits(kind, tab.mode) ? { ...tab, mode: defaultMode(kind) } : tab;
        });
      }
    } catch {
      // Corrupted storage: start over
    }
    return [WELCOME_TAB];
  }

  /** The next free number for a `new-N` tab, so ids stay unique across reloads. */
  private nextTabNumber(): number {
    const numbers = this.tabs()
      .filter((tab) => tab.id.startsWith('new-'))
      .map((tab) => Number(tab.id.replace('new-', '')))
      .filter((n) => Number.isFinite(n));
    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  }

  private readStateFromUrl(): void {
    // apps / :appId / edit / :tabId / :mode
    const segments = this.router.parseUrl(this.router.url).root.children['primary']?.segments;
    if (segments?.[0]?.path !== 'apps' || segments[2]?.path !== 'edit') return;

    const tabId = segments[3]?.path;
    const urlMode = segments[4]?.path;
    if (!tabId) return;
    const kind = tabKind(tabId);

    // A mode that doesn't fit the tab (e.g. a page as Start, or Alt+1 on Start): its own mode
    if (kind && (!isEditorMode(urlMode) || !fits(kind, urlMode))) {
      this.redirect(tabId, defaultMode(kind));
      return;
    }
    const mode: EditorMode = isEditorMode(urlMode) ? urlMode : 'edit';

    if (!this.tabs().some((t) => t.id === tabId)) {
      if (!kind) {
        // Not a tab we can make: the first tab instead
        const fallback = this.tabs()[0] ?? WELCOME_TAB;
        if (!this.tabs().length) this.tabs.set([WELCOME_TAB]);
        this.redirect(fallback.id, fallback.mode ?? defaultMode(tabKind(fallback.id) ?? 'page'));
        return;
      }
      // A link to a page, panel or Start tab that isn't open: open it
      this.tabs.update((tabs) => [...tabs, { id: tabId, title: this.titleFor(tabId, kind), mode }]);
    }

    this.updateTabState(tabId, { mode });
    this.activeTabId.set(tabId);
    this.activeMode.set(mode);
  }

  private titleFor(id: string, kind: TabKind): string {
    if (kind === 'start') return START_TAB_TITLE;
    if (kind === 'panel') {
      const name = id.replace(/^panel-/, '');
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return this.pages.page(Number(id))?.name ?? `Page ${id}`;
  }

  private redirect(tabId: string, mode: EditorMode): void {
    this.router.navigate(this.context.path(tabId, mode), { ...EDITOR_NAVIGATION, replaceUrl: true });
  }
}
