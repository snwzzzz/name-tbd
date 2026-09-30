import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PageNavigationService } from './page-navigation.service';
import { PagesStateService } from './pages-state.service';
import { PreviewSessionService } from './preview-session.service';
import { PreviewDataService } from './preview-data.service';
import { TabsService } from './tabs.service';

describe('PageNavigationService', () => {
  let navigated: unknown[][];

  beforeEach(() => {
    navigated = [];
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: PagesStateService, useValue: { page: () => ({ id: 7, name: 'About' }) } },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(async (...args: unknown[]) => {
      navigated.push(args);
      return true;
    });
  });

  it('opens the page in a new tab in edit mode', () => {
    TestBed.inject(PageNavigationService).openPage(7);

    expect(TestBed.inject(TabsService).tabs().some((t) => t.id === '7' && t.title === 'About')).toBe(true);
    expect(navigated).toEqual([[['/editor', '7', 'edit']]]);
  });

  it('keeps a preview (and its data) going on the next page', () => {
    const session = TestBed.inject(PreviewSessionService);
    const reset = vi.spyOn(TestBed.inject(PreviewDataService), 'reset');
    session.start('1');

    TestBed.inject(PageNavigationService).openPage(7);
    session.stop(); // the canvas stops the preview when it switches pages
    expect(reset).not.toHaveBeenCalled();
    expect(session.resumesOn('7')).toBe(true);

    session.start('7');
    session.stop();
    expect(reset).toHaveBeenCalled();
  });
});
