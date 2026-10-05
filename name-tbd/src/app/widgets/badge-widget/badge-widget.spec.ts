import { BadgeWidget } from './badge-widget';
import { mountWidget } from '../../core/testing/widget-testing';

describe('BadgeWidget', () => {
  it('shows its text in its tone and appearance (theme colors)', () => {
    const { el } = mountWidget(BadgeWidget, { text: 'Paid', tone: 'Success', variant: 'Solid' });
    const badge = el.querySelector<HTMLElement>('.badge')!;
    expect(badge.textContent).toBe('Paid');
    expect(badge.classList).toContain('solid');
    expect(badge.style.getPropertyValue('--tone')).toBe('var(--widget-success)');
  });
});
