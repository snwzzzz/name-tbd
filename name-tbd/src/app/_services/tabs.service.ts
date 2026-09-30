import { Injectable, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { EditorMode, TabItem } from '../_types/tab.types';

const STORAGE_KEY = 'editor-tabs';
const EDITOR_MODES: EditorMode[] = ['welcome', 'edit', 'workflow', 'data'];
const WELCOME_TAB: TabItem = { id: 'welcome-0', title: 'Welcome', mode: 'welcome' };

const isEditorMode = (value: string | undefined): value is EditorMode =>
  EDITOR_MODES.includes(value as EditorMode);

/**
 * The editor's open tabs. The URL (`/editor/:tabId/:mode`) is the source of truth for the
 * active tab and mode; the tab list itself is kept in sessionStorage.
 */
@Injectable({ providedIn: 'root' })
export class TabsService {
  private readonly router = inject(Router);

  readonly tabs = signal<TabItem[]>([]);
  readonly activeTabId = signal<string | null>(null);
  readonly activeMode = signal<EditorMode>('edit');

  constructor() {
    this.tabs.set(this.restoreTabs());

    effect(() => sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.tabs())));

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.readStateFromUrl());
    setTimeout(() => this.readStateFromUrl(), 0);
  }

  addTab(): void {
    const id = `new-${this.nextTabNumber()}`;
    this.tabs.update((tabs) => [...tabs, { id, title: 'Welcome', mode: 'welcome' }]);
    this.selectTab(id);
  }

  updateTabState(id: string, updates: Partial<TabItem>): void {
    this.tabs.update((tabs) => tabs.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }

  closeTab(id: string): void {
    const wasActive = this.activeTabId() === id;
    this.tabs.update((tabs) => tabs.filter((tab) => tab.id !== id));

    const remaining = this.tabs();
    if (wasActive && remaining.length > 0) {
      this.selectTab(remaining[0].id);
    } else if (remaining.length === 0) {
      this.router.navigate(['/editor']);
    }
  }

  /** Open a tab in the mode it was last used in. */
  selectTab(id: string): void {
    const tab = this.tabs().find((t) => t.id === id);
    this.router.navigate(['/editor', id, tab?.mode ?? 'edit']);
  }

  /** Switch the active tab to another mode. */
  setMode(mode: EditorMode): void {
    const tabId = this.activeTabId();
    if (tabId) this.router.navigate(['/editor', tabId, mode]);
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
      const saved: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null');
      if (Array.isArray(saved) && saved.length > 0) return saved as TabItem[];
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
    const segments = this.router.parseUrl(this.router.url).root.children['primary']?.segments;
    if (segments?.[0]?.path !== 'editor') return;

    const tabId = segments[1]?.path;
    const urlMode = segments[2]?.path;
    const mode: EditorMode = isEditorMode(urlMode) ? urlMode : 'edit';

    const tabs = this.tabs();
    if (tabs.length === 0) {
      this.tabs.set([WELCOME_TAB]);
      return;
    }
    if (!tabId) return;

    if (!tabs.some((t) => t.id === tabId)) {
      // Unknown tab in the URL: fall back to the first one
      const fallback = tabs[0];
      this.router.navigate(['/editor', fallback.id, fallback.mode ?? 'edit'], { replaceUrl: true });
      return;
    }

    this.updateTabState(tabId, { mode });
    this.activeTabId.set(tabId);
    this.activeMode.set(mode);
  }
}
