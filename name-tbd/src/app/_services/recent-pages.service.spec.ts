import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RecentPagesService } from './recent-pages.service';
import { TabsService } from './tabs.service';
import { EditorMode } from '../_types/tab.types';

describe('RecentPagesService', () => {
  const activeTabId = signal<string | null>(null);
  const activeMode = signal<EditorMode>('welcome');

  beforeEach(() => {
    localStorage.clear();
    activeTabId.set(null);
    activeMode.set('welcome');
    TestBed.configureTestingModule({ providers: [{ provide: TabsService, useValue: { activeTabId, activeMode } }] });
  });

  it('notices pages as their tabs are opened, newest first, each once', () => {
    const recent = TestBed.inject(RecentPagesService);
    for (const id of ['3', '7', '3']) {
      activeTabId.set(id);
      activeMode.set('edit');
      TestBed.tick();
    }
    expect(recent.recent().map((r) => r.pageId)).toEqual([3, 7]);
  });

  it('ignores the Start and panel tabs', () => {
    const recent = TestBed.inject(RecentPagesService);
    activeTabId.set('welcome-0');
    TestBed.tick();
    activeTabId.set('panel-data');
    activeMode.set('panel');
    TestBed.tick();
    expect(recent.recent()).toEqual([]);
  });
});
