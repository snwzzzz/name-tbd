import { TestBed } from '@angular/core/testing';
import { ToggleWidget } from './toggle-widget';
import { mountWidget } from '../../core/testing/widget-testing';
import { InputValuesService } from '../../core/services/input-values.service';

describe('ToggleWidget', () => {
  it('is a switch named by its label, switched by a click (or the keyboard) while the app runs', () => {
    const { el, goLive, fixture } = mountWidget(ToggleWidget, { label: 'Active' });
    const button = el.querySelector<HTMLButtonElement>('[role="switch"]')!;
    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(el.querySelector('#' + button.getAttribute('aria-labelledby'))?.textContent).toBe('Active');

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('false');

    goLive();
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(TestBed.inject(InputValuesService).get('7')).toBe('true');
  });
});
