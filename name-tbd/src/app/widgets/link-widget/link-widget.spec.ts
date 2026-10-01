import { TestBed } from '@angular/core/testing';
import { LinkWidget } from './link-widget';
import { WidgetProps } from '../../_types/layout.types';
import { fakeApp, provideFakeApp } from '../../core/testing/fake-app';

describe('LinkWidget', () => {
  const mount = (props: WidgetProps) => {
    TestBed.configureTestingModule({ providers: provideFakeApp({ pages: [{ id: 4, name: 'About', path: '/about' }] }) });
    const fixture = TestBed.createComponent(LinkWidget);
    fixture.componentRef.setInput('id', '1');
    fixture.componentRef.setInput('props', props);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
  };

  it('links to its page by path, but only follows it while the app runs', () => {
    const a = mount({ text: 'About', pageId: '4' });
    expect(a.textContent).toBe('About');
    expect(a.getAttribute('href')).toBe('/about');

    a.click();
    expect(fakeApp().navigation.opened).toEqual([]);

    fakeApp().session.start('1');
    a.click();
    expect(fakeApp().navigation.opened).toEqual([4]);
  });

  it('opens a URL in a new browser tab when no page is picked', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const a = mount({ text: 'Docs', url: 'https://example.com', newTab: 'true' });
    fakeApp().session.start('1');

    expect(a.getAttribute('target')).toBe('_blank');
    a.click();
    expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener');
    expect(fakeApp().navigation.opened).toEqual([]);
    open.mockRestore();
  });
});
