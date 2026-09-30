import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LinkWidget } from './link-widget';
import { PagesStateService } from '../../_services/pages-state.service';
import { PageNavigationService } from '../../_services/page-navigation.service';
import { PreviewSessionService } from '../../_services/preview-session.service';
import { WidgetProps } from '../../_types/layout.types';

describe('LinkWidget', () => {
  let opened: number[];
  const active = signal(false);

  const mount = (props: WidgetProps) => {
    opened = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PagesStateService,
          useValue: { ensureLoaded: () => {}, page: (id: number) => (id === 4 ? { id: 4, path: '/about' } : undefined) },
        },
        { provide: PageNavigationService, useValue: { openPage: (id: number) => opened.push(id) } },
        { provide: PreviewSessionService, useValue: { active } },
      ],
    });
    const fixture = TestBed.createComponent(LinkWidget);
    fixture.componentRef.setInput('id', '1');
    fixture.componentRef.setInput('props', props);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
  };

  it('links to its page by path, but only follows it in a preview', () => {
    active.set(false);
    const a = mount({ text: 'About', pageId: '4' });
    expect(a.textContent).toBe('About');
    expect(a.getAttribute('href')).toBe('/about');

    a.click();
    expect(opened).toEqual([]);

    active.set(true);
    a.click();
    expect(opened).toEqual([4]);
  });

  it('opens a URL in a new browser tab when no page is picked', () => {
    active.set(true);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const a = mount({ text: 'Docs', url: 'https://example.com', newTab: 'true' });

    expect(a.getAttribute('target')).toBe('_blank');
    a.click();
    expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener');
    expect(opened).toEqual([]);
    open.mockRestore();
  });
});
