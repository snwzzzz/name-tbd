import { IconWidget } from './icon-widget';
import { mountWidget } from '../../core/testing/widget-testing';
import { ICON_SET } from '../../core/rendering/icon-set';
import { WIDGET_CATALOG } from '../../core/catalog/widget-catalog';

describe('IconWidget', () => {
  it('offers exactly the icons of its icon set', () => {
    const offered = WIDGET_CATALOG.widgets.find((w) => w.type === 'icon')!.props.find((p) => p.key === 'icon')!.options;
    expect(offered).toEqual(Object.keys(ICON_SET));
  });

  it('is an image with its meaning, or decorative without one', () => {
    const { el, setProps } = mountWidget(IconWidget, { icon: 'Mail', label: 'Email us' });
    const icon = el.querySelector('.icon')!;
    expect(icon.getAttribute('role')).toBe('img');
    expect(icon.getAttribute('aria-label')).toBe('Email us');
    expect(el.querySelectorAll('svg path').length).toBeGreaterThan(0);

    setProps({ icon: 'Mail' });
    expect(icon.getAttribute('role')).toBeNull();
    expect(icon.getAttribute('aria-hidden')).toBe('true');
  });
});
