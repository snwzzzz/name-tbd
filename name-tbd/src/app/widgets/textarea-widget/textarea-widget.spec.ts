import { TestBed } from '@angular/core/testing';
import { TextareaWidget } from './textarea-widget';
import { mountWidget } from '../../core/testing/widget-testing';
import { InputValuesService } from '../../core/services/input-values.service';

describe('TextareaWidget', () => {
  it('keeps several lines of text while the app runs, no longer than its max length', () => {
    const { el, goLive } = mountWidget(TextareaWidget, { label: 'Notes', max: '200' });
    const area = el.querySelector('textarea')!;
    expect(area.maxLength).toBe(200);
    expect(area.readOnly).toBe(true);

    goLive();
    area.value = 'line 1\nline 2';
    area.dispatchEvent(new Event('input'));
    expect(TestBed.inject(InputValuesService).get('7')).toBe('line 1\nline 2');
  });
});
