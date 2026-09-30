import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavWidget } from './nav-widget';
import { PagesStateService } from '../../_services/pages-state.service';
import { PageNavigationService } from '../../_services/page-navigation.service';
import { PreviewSessionService } from '../../_services/preview-session.service';
import { TabsService } from '../../_services/tabs.service';
import { WidgetProps } from '../../_types/layout.types';

const PAGES = [
  { id: 1, name: 'Home', path: '/' },
  { id: 2, name: 'About', path: '/about' },
  { id: 3, name: 'Contact', path: '/contact' },
];

describe('NavWidget', () => {
  let opened: number[];

  const mount = (props: WidgetProps, previewing = false) => {
    opened = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: PagesStateService, useValue: { ensureLoaded: () => {}, page: (id: number) => PAGES.find((p) => p.id === id) } },
        { provide: PageNavigationService, useValue: { openPage: (id: number) => opened.push(id) } },
        { provide: PreviewSessionService, useValue: { active: signal(previewing) } },
        { provide: TabsService, useValue: { activeTabId: signal('2') } },
      ],
    });
    const fixture = TestBed.createComponent(NavWidget);
    fixture.componentRef.setInput('id', '1');
    fixture.componentRef.setInput('props', props);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('links the chosen pages in their order, marking the open one', () => {
    const el = mount({ pages: '["3","2","99"]', highlightCurrent: 'true' });
    const links = [...el.querySelectorAll('a')];

    expect(links.map((a) => a.textContent)).toEqual(['Contact', 'About']);
    expect(links[1].getAttribute('aria-current')).toBe('page');
    expect(links[0].getAttribute('aria-current')).toBeNull();
  });

  it('follows links only in a preview', () => {
    let el = mount({ pages: '["1"]' });
    el.querySelector('a')!.click();
    expect(opened).toEqual([]);

    TestBed.resetTestingModule();
    el = mount({ pages: '["1"]' }, true);
    el.querySelector('a')!.click();
    expect(opened).toEqual([1]);
  });

  it('asks for pages when none are chosen', () => {
    expect(mount({ pages: '[]' }).textContent).toContain('Pick pages');
  });
});
