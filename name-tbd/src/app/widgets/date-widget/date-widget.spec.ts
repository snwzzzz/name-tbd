import { TestBed } from '@angular/core/testing';
import { DateWidget } from './date-widget';
import { mountWidget } from '../../core/testing/widget-testing';
import { InputValuesService } from '../../core/services/input-values.service';

describe('DateWidget', () => {
  it('is a date field within its earliest and latest dates, keeping the picked date', () => {
    const { el, fired, goLive } = mountWidget(DateWidget, { label: 'Due', min: '2026-01-01', max: '2026-12-31' });
    const input = el.querySelector('input')!;
    expect([input.type, input.min, input.max]).toEqual(['date', '2026-01-01', '2026-12-31']);

    goLive();
    input.value = '2026-05-04';
    input.dispatchEvent(new Event('change'));
    expect(TestBed.inject(InputValuesService).get('7')).toBe('2026-05-04');
    expect(fired).toHaveLength(1);
  });
});
