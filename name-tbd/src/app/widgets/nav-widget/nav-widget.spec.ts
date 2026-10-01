import { TestBed } from '@angular/core/testing';
import { NavWidget } from './nav-widget';
import { WidgetProps } from '../../_types/layout.types';
import { fakeApp, provideFakeApp } from '../../core/testing/fake-app';

const PAGES = [
  { id: 1, name: 'Home', path: '/' },
  { id: 2, name: 'About', path: '/about' },
  { id: 3, name: 'Contact', path: '/contact' },
];

describe('NavWidget', () => {
  const mount = (props: WidgetProps) => {
    TestBed.configureTestingModule({ providers: provideFakeApp({ pages: PAGES }) });
    fakeApp().navigation.currentPageId.set('2');
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

  it('follows links only while the app runs', () => {
    const el = mount({ pages: '["1"]' });
    el.querySelector('a')!.click();
    expect(fakeApp().navigation.opened).toEqual([]);

    fakeApp().session.start('2');
    el.querySelector('a')!.click();
    expect(fakeApp().navigation.opened).toEqual([1]);
  });

  it('asks for pages when none are chosen', () => {
    expect(mount({ pages: '[]' }).textContent).toContain('Pick pages');
  });
});
