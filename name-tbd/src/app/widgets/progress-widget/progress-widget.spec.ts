import { ProgressWidget } from './progress-widget';
import { mountWidget } from '../../core/testing/widget-testing';

describe('ProgressWidget', () => {
  it('fills its bar to value / maximum, announced as a progress bar', () => {
    const { el, setProps } = mountWidget(ProgressWidget, { label: 'Done', value: '30', max: '120' });
    const bar = el.querySelector<HTMLElement>('[role="progressbar"]')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('30');
    expect(bar.getAttribute('aria-valuemax')).toBe('120');
    expect(el.querySelector<HTMLElement>('.fill')!.style.width).toBe('25%');
    expect(el.textContent).toContain('25%');

    // Kept within 0 and the maximum
    setProps({ value: '500', max: '100' });
    expect(el.querySelector<HTMLElement>('.fill')!.style.width).toBe('100%');
  });
});
