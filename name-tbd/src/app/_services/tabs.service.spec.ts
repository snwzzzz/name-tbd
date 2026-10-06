import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TabsService, tabKind } from './tabs.service';
import { PagesStateService } from './pages-state.service';
import { PageDto } from '../api/models';
import { provideTestEditorContext } from '../_testing/editor-context.testing';

describe('TabsService', () => {
  let navigated: unknown[][];
  const pages = signal<PageDto[]>([]);

  beforeEach(() => {
    navigated = [];
    pages.set([]);
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideTestEditorContext(), 
        { provide: PagesStateService, useValue: { pages, ensureLoaded: () => {}, page: (id: number) => pages().find((p) => p.id === id) } },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(async (...args: unknown[]) => {
      navigated.push(args);
      return true;
    });
  });

  it('tells what a tab is from its id', () => {
    expect(['welcome-0', 'new-3', 'panel-data', '42', '-1', 'nonsense'].map(tabKind)).toEqual(['start', 'start', 'panel', 'page', 'page', null]);
  });

  it('keeps the query parameters (sidebar state) when switching tab or mode', () => {
    const tabs = TestBed.inject(TabsService);
    tabs.tabs.update((all) => [...all, { id: '4', title: 'Home', mode: 'edit' }]);
    tabs.activeTabId.set('4');

    tabs.setMode('workflow');
    tabs.selectTab('welcome-0');

    expect(navigated).toEqual([
      [['/apps', 3, 'edit', '4', 'workflow'], { queryParamsHandling: 'preserve' }],
      [['/apps', 3, 'edit', 'welcome-0', 'welcome'], { queryParamsHandling: 'preserve' }],
    ]);
  });

  it("doesn't switch the Start tab to a page mode", () => {
    const tabs = TestBed.inject(TabsService);
    tabs.activeTabId.set('welcome-0');

    tabs.setMode('edit');
    expect(navigated).toEqual([]);
  });

  it('leaves a fresh Start tab when the last tab is closed', () => {
    const tabs = TestBed.inject(TabsService);
    tabs.activeTabId.set('welcome-0');

    tabs.closeTab('welcome-0');
    expect(tabs.tabs()).toEqual([{ id: 'welcome-0', title: 'Start', mode: 'welcome' }]);
    expect(navigated.at(-1)?.[0]).toEqual(['/apps', 3, 'edit', 'welcome-0', 'welcome']);
  });

  it('repairs saved tabs whose mode does not fit (e.g. a page saved as Start)', () => {
    sessionStorage.setItem('editor-tabs:3', JSON.stringify([
      { id: 'welcome-0', title: 'Welcome', mode: 'welcome' },
      { id: '4', title: 'Home', mode: 'welcome' },
    ]));
    const tabs = TestBed.inject(TabsService);

    expect(tabs.tabs()).toEqual([
      { id: 'welcome-0', title: 'Start', mode: 'welcome' },
      { id: '4', title: 'Home', mode: 'edit' },
    ]);
  });

  it('titles page tabs after their page, also once the pages load', () => {
    const tabs = TestBed.inject(TabsService);
    tabs.tabs.update((all) => [...all, { id: '4', title: 'Page 4', mode: 'edit' }]);

    pages.set([{ id: 4, name: 'Pricing', path: '/pricing' }]);
    TestBed.tick();
    expect(tabs.tabs().find((t) => t.id === '4')?.title).toBe('Pricing');
  });

  it('opens a sidebar panel as a tab of its own, only once', () => {
    const tabs = TestBed.inject(TabsService);
    tabs.openPanel('data', 'Data');
    tabs.openPanel('data', 'Data');

    expect(tabs.tabs().filter((t) => t.id === 'panel-data')).toEqual([{ id: 'panel-data', title: 'Data', mode: 'panel' }]);
    expect(navigated.at(-1)).toEqual([['/apps', 3, 'edit', 'panel-data', 'panel'], { queryParamsHandling: 'preserve' }]);
  });
});
