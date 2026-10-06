import { TestBed } from '@angular/core/testing';
import { ListWidget } from './list-widget';
import { mountWidget } from '../../core/testing/widget-testing';
import { TableSelectionService } from '../../core/services/table-selection.service';
import { TableFilterService } from '../../core/services/table-filter.service';
import { ITEM_CLICK_EVENT } from '../../_constants/widget-events.constants';

const ORDERS = {
  id: 5, name: 'Orders', columns: ['customer', 'city', 'status', 'total'],
  rows: [['Alice', 'Berlin', 'Open', '20'], ['Bob', 'Vienna', 'Paid', '35']],
};
const PROPS = { dataSourceId: '5', titleColumn: 'customer', subtitleColumn: 'city', badgeColumn: 'status', columns: '["total"]' };

describe('ListWidget', () => {
  it('draws a card per row: title, subtitle, badge and more fields', () => {
    const { el } = mountWidget(ListWidget, PROPS, { data: [ORDERS] });
    const cards = [...el.querySelectorAll('[role="option"]')];
    expect(cards.map((c) => c.querySelector('.title')?.textContent)).toEqual(['Alice', 'Bob']);
    expect(cards[0].querySelector('.subtitle')?.textContent).toBe('Berlin');
    expect(cards[0].querySelector('.badge')?.textContent).toBe('Open');
    expect(cards[0].querySelector('dl')?.textContent).toBe('total20');
  });

  it('selects a row by click or keyboard while the app runs, like a table, and fires its trigger', () => {
    const { el, fired, goLive, fixture } = mountWidget(ListWidget, PROPS, { data: [ORDERS] });
    const card = () => el.querySelectorAll<HTMLElement>('[role="option"]')[1];
    card().click();
    expect(TestBed.inject(TableSelectionService).selected('7')).toEqual([]);

    goLive();
    card().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(TestBed.inject(TableSelectionService).selected('7')).toEqual(['1']);
    expect(card().getAttribute('aria-selected')).toBe('true');
    expect(fired).toEqual([{ pageId: 'page', elementId: '7', event: ITEM_CLICK_EVENT }]);
  });

  it('shows only the cards matching a search', () => {
    const { el, goLive, fixture } = mountWidget(ListWidget, PROPS, { data: [ORDERS] });
    goLive();
    TestBed.inject(TableFilterService).set('7', 'vienna');
    fixture.detectChanges();
    expect([...el.querySelectorAll('.title')].map((t) => t.textContent)).toEqual(['Bob']);
  });
});
