import { TestBed } from '@angular/core/testing';
import { NumberWidget } from './number-widget';
import { mountWidget } from '../../core/testing/widget-testing';
import { InputValuesService } from '../../core/services/input-values.service';
import { CHANGE_EVENT } from '../../_constants/widget-events.constants';

describe('NumberWidget', () => {
  it('keeps what is typed, and fires its change trigger once a number is committed', () => {
    const { el, fired, goLive } = mountWidget(NumberWidget, { label: 'Qty', min: '1', max: '9', step: '1' });
    const input = el.querySelector('input')!;
    expect(input.type).toBe('number');
    expect([input.min, input.max, input.step]).toEqual(['1', '9', '1']);
    expect(input.readOnly).toBe(true);

    goLive();
    input.value = '4';
    input.dispatchEvent(new Event('input'));
    expect(TestBed.inject(InputValuesService).get('7')).toBe('4');
    expect(fired).toEqual([]);
    input.dispatchEvent(new Event('change'));
    expect(fired.map((e) => e.event)).toEqual([CHANGE_EVENT]);
  });
});
