import { Injectable, signal, effect, inject } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs';

export interface TabItem {
  id: string;
  title: string;
  mode?: string; // Tracks the last active mode for this specific tab
}

@Injectable({
  providedIn: 'root'
})
export class TabsService {
  private router = inject(Router);

  // The list of all open tabs
  readonly tabs = signal<TabItem[]>([]);

  // The currently active tab ID and mode, derived from the URL
  readonly activeTabId = signal<string | null>(null);
  readonly activeMode = signal<string>('edit');

  private nextId = 1;

  constructor() {
    this.tabs.set([
      { id: 'welcome-0', title: 'Welcome', mode: 'welcome' }
    ]);
    
    // Listen to router to update activeTabId and activeMode signals
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.parseUrlForState();
    });
    
    // Initial parse
    setTimeout(() => this.parseUrlForState(), 0);
  }

  private parseUrlForState() {
    // URL format: /editor/:tabId/:mode
    const tree = this.router.parseUrl(this.router.url);
    const editorSegment = tree.root.children['primary']?.segments;
    
    if (editorSegment && editorSegment[0]?.path === 'editor') {
      const tabId = editorSegment[1]?.path;
      const mode = editorSegment[2]?.path || 'edit';
      const currentTabs = this.tabs();

      // If no tabs exist, create one
      if (currentTabs.length === 0) {
        this.addTab();
        return;
      }

      if (tabId) {
        const tabExists = currentTabs.some(t => t.id === tabId);
        if (!tabExists) {
          // Invalid tab ID in URL, fallback to the first available tab
          const fallbackMode = currentTabs[0].mode || 'edit';
          this.router.navigate(['/editor', currentTabs[0].id, fallbackMode], { replaceUrl: true });
          return;
        }

        // Keep the tab's mode in sync with the URL
        this.tabs.update(tabs => tabs.map(t => t.id === tabId ? { ...t, mode } : t));

        this.activeTabId.set(tabId);
        this.activeMode.set(mode);
      }
    }
  }

  addTab() {
    const newId = `new-${this.nextId++}`;
    const newTab: TabItem = { id: newId, title: `Welcome`, mode: 'welcome' };
    this.tabs.update(tabs => [...tabs, newTab]);
    this.selectTab(newId);
  }

  updateTabState(id: string, updates: Partial<TabItem>) {
    this.tabs.update(tabs => tabs.map(t => t.id === id ? { ...t, ...updates } : t));
  }

  closeTab(id: string) {
    let navigateToId: string | null = null;

    this.tabs.update(tabs => {
      const remaining = tabs.filter(t => t.id !== id);
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

  selectTab(id: string) {
    const tab = this.tabs().find(t => t.id === id);
    const targetMode = tab?.mode || 'edit';
    this.router.navigate(['/editor', id, targetMode]);
  }

  setMode(mode: string) {
    const tabId = this.activeTabId();
    if (tabId) {
      this.router.navigate(['/editor', tabId, mode]);
    }
  }
  
  reorderTabs(previousIndex: number, currentIndex: number) {
    this.tabs.update(tabs => {
      const newTabs = [...tabs];
      const item = newTabs.splice(previousIndex, 1)[0];
      newTabs.splice(currentIndex, 0, item);
      return newTabs;
    });
  }
}
