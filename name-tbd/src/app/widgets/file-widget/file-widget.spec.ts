import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { FileWidget } from './file-widget';
import { mountWidget } from '../../core/testing/widget-testing';
import { InputValuesService } from '../../core/services/input-values.service';
import { FieldErrorsService } from '../../core/services/field-errors.service';
import { parseFileValue } from '../../core/forms/file-value';

describe('FileWidget', () => {
  it('keeps a picked file inline, with its name, and can remove it', async () => {
    const { fixture, el, goLive } = mountWidget(FileWidget, { label: 'Invoice', maxSizeKb: '10' });
    goLive();
    const widget = fixture.componentInstance;

    widget.take(new File(['%PDF-1.4'], 'invoice.pdf', { type: 'application/pdf' }));
    await vi.waitFor(() => expect(TestBed.inject(InputValuesService).get('7')).toBeTruthy());
    fixture.detectChanges();
    expect(parseFileValue(TestBed.inject(InputValuesService).get('7'))?.name).toBe('invoice.pdf');
    expect(el.textContent).toContain('invoice.pdf');

    el.querySelector<HTMLButtonElement>('.remove')!.click();
    fixture.detectChanges();
    expect(TestBed.inject(InputValuesService).get('7')).toBe('');
    expect(el.querySelector('input[type="file"]')).not.toBeNull();
  });

  it('refuses a file over its size limit, saying so under the field', () => {
    const { fixture, el, goLive } = mountWidget(FileWidget, { maxSizeKb: '1' });
    goLive();
    fixture.componentInstance.take(new File([new Uint8Array(2048)], 'big.bin'));
    fixture.detectChanges();
    expect(TestBed.inject(FieldErrorsService).error('7')).toBe('The file is larger than 1 KB.');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('larger than 1 KB');
    expect(TestBed.inject(InputValuesService).get('7')).toBeUndefined();
  });

  it('takes nothing while editing', () => {
    const { fixture } = mountWidget(FileWidget, {});
    fixture.componentInstance.take(new File(['x'], 'a.txt'));
    expect(TestBed.inject(InputValuesService).get('7')).toBeUndefined();
  });
});
