import { TestBed } from '@angular/core/testing';
import { CheckboxWidget } from './checkbox-widget';
import { mountWidget } from '../../core/testing/widget-testing';
import { InputValuesService } from '../../core/services/input-values.service';
import { CHANGE_EVENT } from '../../_constants/widget-events.constants';

describe('CheckboxWidget', () => {
  it('starts as set, and keeps "true"/"false" once clicked while the app runs', () => {
    const { el, fired, goLive, fixture } = mountWidget(CheckboxWidget, { label: 'Newsletter', checked: 'true' });
    const box = el.querySelector('input')!;
    expect(box.checked).toBe(true);
    expect(el.textContent).toContain('Newsletter');
    expect(box.getAttribute('tabindex')).toBe('-1');

    goLive();
    expect(box.getAttribute('tabindex')).toBeNull();
    box.click();
    fixture.detectChanges();
    expect(TestBed.inject(InputValuesService).get('7')).toBe('false');
    expect(box.checked).toBe(false);
    expect(fired.map((e) => e.event)).toEqual([CHANGE_EVENT]);
  });
});
