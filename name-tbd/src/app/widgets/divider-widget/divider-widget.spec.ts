import { DividerWidget } from './divider-widget';
import { mountWidget } from '../../core/testing/widget-testing';

describe('DividerWidget', () => {
  it('draws a separator line in its direction, thickness, style and color', () => {
    const { el, setProps } = mountWidget(DividerWidget, { thickness: '3', lineStyle: 'Dashed', color: '#ff0000' });
    const line = el.querySelector<HTMLElement>('[role="separator"]')!;
    expect(line.getAttribute('aria-orientation')).toBe('horizontal');
    expect(line.style.getPropertyValue('--line')).toBe('3px dashed #ff0000');

    setProps({ orientation: 'Vertical' });
    expect(line.getAttribute('aria-orientation')).toBe('vertical');
    expect(line.style.getPropertyValue('--line')).toBe('1px solid var(--widget-stroke)');
  });
});
