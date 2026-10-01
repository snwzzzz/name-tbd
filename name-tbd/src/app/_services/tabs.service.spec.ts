import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TabsService } from './tabs.service';

describe('TabsService', () => {
  let navigated: unknown[][];

  beforeEach(() => {
    navigated = [];
    sessionStorage.clear();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(async (...args: unknown[]) => {
      navigated.push(args);
      return true;
    });
  });

  it('keeps the query parameters (sidebar state) when switching tab or mode', () => {
    const tabs = TestBed.inject(TabsService);
    tabs.activeTabId.set('welcome-0');

    tabs.setMode('workflow');
    tabs.selectTab('welcome-0');

    expect(navigated).toEqual([
      [['/editor', 'welcome-0', 'workflow'], { queryParamsHandling: 'preserve' }],
      [['/editor', 'welcome-0', 'welcome'], { queryParamsHandling: 'preserve' }],
    ]);
  });

  it('calls the start tab "Start", also when it was saved as "Welcome"', () => {
    sessionStorage.setItem('editor-tabs', JSON.stringify([{ id: 'welcome-0', title: 'Welcome', mode: 'welcome' }, { id: '4', title: 'Home', mode: 'edit' }]));
    const tabs = TestBed.inject(TabsService);

    expect(tabs.tabs().map((t) => t.title)).toEqual(['Start', 'Home']);
    tabs.addTab();
    expect(tabs.tabs().at(-1)?.title).toBe('Start');
  });

  it('opens a sidebar panel as a tab of its own, only once', () => {
    const tabs = TestBed.inject(TabsService);
    tabs.openPanel('data', 'Data');
    tabs.openPanel('data', 'Data');

    expect(tabs.tabs().filter((t) => t.id === 'panel-data')).toEqual([{ id: 'panel-data', title: 'Data', mode: 'panel' }]);
    expect(navigated.at(-1)).toEqual([['/editor', 'panel-data', 'panel'], { queryParamsHandling: 'preserve' }]);
  });
});
