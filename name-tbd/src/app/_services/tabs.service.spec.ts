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
});
