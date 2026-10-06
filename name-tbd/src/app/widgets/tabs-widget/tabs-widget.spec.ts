import { TestBed } from '@angular/core/testing';
import { TabsWidget } from './tabs-widget';
import { mountWidget } from '../../core/testing/widget-testing';
import { ActiveTabsService } from '../../core/services/active-tabs.service';

describe('TabsWidget', () => {
  it('shows a tab when clicked (also while editing, to lay it out) and moves along with the arrow keys', () => {
    const { el, fixture } = mountWidget(TabsWidget, { tabs: 'One\nTwo\nThree' });
    const tabs = () => [...el.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    expect(tabs().map((t) => t.textContent?.trim())).toEqual(['One', 'Two', 'Three']);
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);

    tabs()[1].click();
    fixture.detectChanges();
    expect(TestBed.inject(ActiveTabsService).active('7')).toBe(1);
    expect(tabs()[1].getAttribute('tabindex')).toBe('0');

    tabs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    tabs()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(TestBed.inject(ActiveTabsService).active('7')).toBe(0);
  });
});
