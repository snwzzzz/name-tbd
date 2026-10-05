import { TestBed } from '@angular/core/testing';
import { SelectWidget } from './select-widget';
import { mountWidget } from '../../core/testing/widget-testing';
import { InputValuesService } from '../../core/services/input-values.service';
import { FieldErrorsService } from '../../core/services/field-errors.service';
import { CHANGE_EVENT } from '../../_constants/widget-events.constants';

const options = (el: HTMLElement) => [...el.querySelectorAll('option')].map((o) => o.textContent?.trim());

describe('SelectWidget', () => {
  it('lists its typed-in options after the placeholder, labelled for screen readers', () => {
    const { el } = mountWidget(SelectWidget, { label: 'Size', options: 'S\n M \n\nL', placeholder: 'Pick…' });
    expect(options(el)).toEqual(['Pick…', 'S', 'M', 'L']);
    expect(el.querySelector('label')?.getAttribute('for')).toBe(el.querySelector('select')?.id);
  });

  it("lists a data source column's values once each, instead", () => {
    const { el } = mountWidget(SelectWidget, { options: 'ignored', dataSourceId: '5', optionsColumn: 'city' }, {
      data: [{ id: 5, name: 'People', columns: ['name', 'city'], rows: [['A', 'Berlin'], ['B', 'Vienna'], ['C', 'Berlin']] }],
    });
    expect(options(el)).toEqual(['', 'Berlin', 'Vienna']);
  });

  it('keeps what is picked while the app runs and fires its change trigger; picking fixes its error', () => {
    const { el, fired, goLive, fixture } = mountWidget(SelectWidget, { options: 'S\nM', required: 'true' });
    const select = el.querySelector('select')!;
    select.value = 'M';
    select.dispatchEvent(new Event('change'));
    expect(TestBed.inject(InputValuesService).get('7')).toBeUndefined();

    goLive();
    TestBed.inject(FieldErrorsService).set('7', 'Please choose one.');
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Please choose one.');
    expect(select.getAttribute('aria-invalid')).toBe('true');

    select.value = 'M';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(TestBed.inject(InputValuesService).get('7')).toBe('M');
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(fired).toEqual([{ pageId: 'page', elementId: '7', event: CHANGE_EVENT }]);
  });
});
