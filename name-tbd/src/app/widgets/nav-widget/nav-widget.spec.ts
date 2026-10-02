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

  it('takes its appearance, accent and background (underline and transparent by default)', () => {
    const plain = mount({ pages: '["2"]' }).querySelector('nav') as HTMLElement;
    expect(plain.classList).toContain('variant-underline');
    expect(plain.style.background).toBe('');
    expect(plain.style.getPropertyValue('--nav-accent')).toBe('#2f89ff');

    TestBed.resetTestingModule();
    const filled = mount({ pages: '["2"]', variant: 'Filled', accentColor: '#c50f1f', background: '#f5f5f5' }).querySelector('nav') as HTMLElement;
    expect(filled.classList).toContain('variant-filled');
    expect(filled.classList).toContain('nav');
    expect(filled.style.getPropertyValue('--nav-accent')).toBe('#c50f1f');
    expect(filled.style.background).toBe('rgb(245, 245, 245)');
  });

  it('fits its text and current-page colors to its background unless they are picked', () => {
    const dark = mount({ pages: '["1"]', background: '#1b1b1b', variant: 'Filled' }).querySelector('nav') as HTMLElement;
    expect(dark.style.color).toBe('rgb(255, 255, 255)');
    // Filled, no color picked: a tone of its background (lighter, as it's near-black), white text on it
    expect(dark.style.getPropertyValue('--nav-accent')).toBe('#484848');
    expect(dark.style.getPropertyValue('--nav-on-accent')).toBe('#ffffff');
    TestBed.resetTestingModule();

    const picked = mount({ pages: '["1"]', background: '#1b1b1b', color: '#ffd700', accentColor: '#0f6cbd' }).querySelector('nav') as HTMLElement;
    expect(picked.style.color).toBe('rgb(255, 215, 0)');
    expect(picked.style.getPropertyValue('--nav-on-accent')).toBe('#ffffff');
    TestBed.resetTestingModule();

    const plain = mount({ pages: '["1"]' }).querySelector('nav') as HTMLElement;
    expect(plain.style.color).toBe('rgb(36, 36, 36)');
    expect(plain.style.getPropertyValue('--nav-accent')).toBe('#2f89ff');
    TestBed.resetTestingModule();

    // Filled on a blue bar: a darker blue, with white text
    const filled = mount({ pages: '["1"]', background: '#2f89ff', variant: 'Filled' }).querySelector('nav') as HTMLElement;
    expect(filled.style.getPropertyValue('--nav-accent')).toBe('#2876db');
    expect(filled.style.getPropertyValue('--nav-on-accent')).toBe('#ffffff');
  });

  it('asks for pages when none are chosen, only in the editor', () => {
    expect(mount({ pages: '[]' }).textContent).toContain('Pick pages');
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({ providers: provideFakeApp({ pages: PAGES }) });
    fakeApp().session.start('2');
    const fixture = TestBed.createComponent(NavWidget);
    fixture.componentRef.setInput('id', '1');
    fixture.componentRef.setInput('props', { pages: '[]' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Pick pages');
  });
});
