import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { Welcome } from './welcome';
import { PagesStateService } from '../../_services/pages-state.service';
import { RecentPage, RecentPagesService } from '../../_services/recent-pages.service';
import { PageControllerService } from '../../api/services/pageController.service';
import { PageDto } from '../../api/models';

describe('Welcome (Start tab)', () => {
  let navigated: unknown[][];
  let created: unknown[];
  const pages = signal<PageDto[]>([]);
  const recent = signal<RecentPage[]>([]);

  const mount = () => {
    navigated = [];
    created = [];
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PagesStateService,
          useValue: {
            pages, loaded: signal(true), layoutPage: signal(pages().find((p) => p.layout) ?? null),
            refresh: () => {}, ensureLoaded: () => {}, page: (id: number) => pages().find((p) => p.id === id),
          },
        },
        { provide: RecentPagesService, useValue: { recent } },
        {
          provide: PageControllerService,
          useValue: { createPage: (command: unknown) => { created.push(command); return of({ id: 50, name: 'Layout' }); } },
        },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(async (...args: unknown[]) => {
      navigated.push(args);
      return true;
    });
    const fixture = TestBed.createComponent(Welcome);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };
  const rows = (el: HTMLElement) => [...el.querySelectorAll('.row:not(.head)')] as HTMLElement[];
  const names = (el: HTMLElement) => rows(el).map((r) => r.querySelector('.name')?.textContent?.trim());

  it('lists the recently opened pages first, filled up to five', () => {
    pages.set([1, 2, 3, 4, 5, 6, 7].map((id) => ({ id, name: `P${id}`, path: `/p${id}` })));
    recent.set([{ pageId: 6, openedAt: Date.now() - 5 * 60_000 }, { pageId: 2, openedAt: Date.now() - 2 * 3_600_000 }]);
    const el = mount();

    expect(names(el)).toEqual(['P6', 'P2', 'P1', 'P3', 'P4']);
    expect(rows(el)[0].textContent).toContain('5 min ago');
    expect(rows(el)[2].textContent).toContain('—');
  });

  it('opens a page with one click', () => {
    pages.set([{ id: 1, name: 'Home', path: '/' }]);
    recent.set([]);
    rows(mount())[0].click();
    expect(navigated.map((n) => n[0])).toEqual([['/editor', '1', 'edit']]);
  });

  it('creates the layout page from the quick action when there is none, then opens it', () => {
    pages.set([{ id: 1, name: 'Home', path: '/' }]);
    const el = mount();

    const tile = el.querySelector('.tile') as HTMLElement;
    expect(tile.textContent).toContain('Create layout page');
    tile.click();
    expect(created).toEqual([{ branchId: -1, name: 'Layout', path: '/layout', layout: true }]);
    expect(navigated.at(-1)?.[0]).toEqual(['/editor', '50', 'edit']);
  });

  it('opens the existing layout page instead of making another', () => {
    pages.set([{ id: 9, name: 'Layout', path: '/layout', layout: true }]);
    const el = mount();

    (el.querySelector('.tile') as HTMLElement).click();
    expect(created).toEqual([]);
    expect(navigated.at(-1)?.[0]).toEqual(['/editor', '9', 'edit']);
  });

  it('has the three cards: build, open, manage data', () => {
    pages.set([]);
    const el = mount();

    expect([...el.querySelectorAll('.feature h2')].map((h) => h.textContent)).toEqual(['Build a page', 'Open a page', 'Manage data']);
    expect(el.querySelector('.empty')?.textContent).toContain('No pages yet');
  });
});
