import { Injectable, signal, effect, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

export interface TabItem {
  id: string;
  title: string;
  mode?: string; // Tracks the last active mode for this specific tab
}

@Injectable({
  providedIn: 'root',
})
export class TabsService {
  private router = inject(Router);

  private readonly STORAGE_KEY = 'editor-tabs';

  // The list of all open tabs
  readonly tabs = signal<TabItem[]>([]);

  // The currently active tab ID and mode, derived from the URL
  readonly activeTabId = signal<string | null>(null);
  readonly activeMode = signal<string>('edit');

  constructor() {
    // Restore tabs from sessionStorage
    this.restoreTabs();

    // Automatically save tabs whenever the signal changes
    effect(() => {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.tabs()));
    });

    // Listen to router to update activeTabId and activeMode signals
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.parseUrlForState();
    });

    // Initial parse
    setTimeout(() => this.parseUrlForState(), 0);
  }

  /**
   * Restore previously opened tabs from sessionStorage.
   * If nothing was saved, create the default Welcome tab.
   */
  private restoreTabs() {
    const savedTabs = sessionStorage.getItem(this.STORAGE_KEY);

    if (!savedTabs) {
      this.createDefaultTab();
      return;
    }

    try {
      const parsedTabs = JSON.parse(savedTabs);

      if (Array.isArray(parsedTabs) && parsedTabs.length > 0) {
        this.tabs.set(parsedTabs);
      } else {
        this.createDefaultTab();
      }
    } catch {
      // Invalid/corrupted sessionStorage data
      this.createDefaultTab();
    }
  }

  /**
   * Create the default Welcome tab.
   */
  private createDefaultTab() {
    this.tabs.set([
      {
        id: 'welcome-0',
        title: 'Welcome',
        mode: 'welcome',
      },
    ]);
  }

  /**
   * Parse the current URL and update the active tab/mode.
   *
   * URL format:
   * /editor/:tabId/:mode
   */
  private parseUrlForState() {
    const tree = this.router.parseUrl(this.router.url);

    const editorSegment = tree.root.children['primary']?.segments;

    if (editorSegment && editorSegment[0]?.path === 'editor') {
      const tabId = editorSegment[1]?.path;
      const mode = editorSegment[2]?.path || 'edit';

      const currentTabs = this.tabs();

      // If no tabs exist, create one
      if (currentTabs.length === 0) {
        this.createDefaultTab();
        return;
      }

      if (tabId) {
        const tabExists = currentTabs.some((t) => t.id === tabId);

        if (!tabExists) {
          // Invalid tab ID in URL, fallback to the first available tab
          const fallbackTab = currentTabs[0];
          const fallbackMode = fallbackTab.mode || 'edit';

          this.router.navigate(['/editor', fallbackTab.id, fallbackMode], { replaceUrl: true });

          return;
        }

        // Keep the tab's mode in sync with the URL
        this.tabs.update((tabs) => tabs.map((t) => (t.id === tabId ? { ...t, mode } : t)));

        this.activeTabId.set(tabId);
        this.activeMode.set(mode);
      }
    }
  }

  /**
   * Add a new tab.
   */
  addTab() {
    const newId = `new-${this.getNextId()}`;

    const newTab: TabItem = {
      id: newId,
      title: 'Welcome',
      mode: 'welcome',
    };

    this.tabs.update((tabs) => [...tabs, newTab]);

    this.selectTab(newId);
  }

  /**
   * Generate the next available numeric tab ID.
   *
   * This prevents IDs from resetting after a page reload.
   */
  private getNextId(): number {
    const ids = this.tabs()
      .map((tab) => tab.id)
      .filter((id) => id.startsWith('new-'))
      .map((id) => Number(id.replace('new-', '')))
      .filter((id) => Number.isFinite(id));

    if (ids.length === 0) {
      return 1;
    }

    return Math.max(...ids) + 1;
  }

  /**
   * Update the state of a specific tab.
   */
  updateTabState(id: string, updates: Partial<TabItem>) {
    this.tabs.update((tabs) => tabs.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }

  /**
   * Close a tab.
   */
  closeTab(id: string) {
    let navigateToId: string | null = null;

    this.tabs.update((tabs) => {
      const remaining = tabs.filter((tab) => tab.id !== id);

      const isClosingActive = this.activeTabId() === id;

      if (isClosingActive && remaining.length > 0) {
        navigateToId = remaining[0].id;
      }

      return remaining;
    });

    if (navigateToId) {
      this.selectTab(navigateToId);
    } else if (this.tabs().length === 0) {
      this.router.navigate(['/editor']);
    }
  }

  /**
   * Select a tab and navigate to its last active mode.
   */
  selectTab(id: string) {
    const tab = this.tabs().find((t) => t.id === id);

    const targetMode = tab?.mode || 'edit';

    this.router.navigate(['/editor', id, targetMode]);
  }

  /**
   * Change the mode of the currently active tab.
   */
  setMode(mode: string) {
    const tabId = this.activeTabId();

    if (tabId) {
      this.router.navigate(['/editor', tabId, mode]);
    }
  }

  /**
   * Reorder tabs.
   */
  reorderTabs(previousIndex: number, currentIndex: number) {
    this.tabs.update((tabs) => {
      const newTabs = [...tabs];

      const item = newTabs.splice(previousIndex, 1)[0];

      newTabs.splice(currentIndex, 0, item);

      return newTabs;
    });
  }

  /**
   * Optional helper if you ever want to
   * manually clear the saved session.
   */
  clearSavedTabs() {
    sessionStorage.removeItem(this.STORAGE_KEY);
    this.createDefaultTab();
  }
}
