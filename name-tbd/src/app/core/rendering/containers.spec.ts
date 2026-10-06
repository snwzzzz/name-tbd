import { containerClass, inFlow, innerRows, tabNames, visibleChildren } from './containers';
import { LayoutItem } from '../../_types/layout.types';

describe('containers', () => {
  const tabs: LayoutItem = {
    id: 1, type: 'tabs', h: 20, props: { tabs: 'One\nTwo\n' },
    children: [
      { id: 2, type: 'label', props: {} },
      { id: 3, type: 'label', props: { tab: '1' } },
      // A tab that was removed since: shown on the last one
      { id: 4, type: 'label', props: { tab: '5' } },
    ],
  };

  it('shows the widgets of the active tab only', () => {
    expect(tabNames(tabs.props)).toEqual(['One', 'Two']);
    expect(visibleChildren(tabs, 0).map((c) => c.id)).toEqual([2]);
    expect(visibleChildren(tabs, 1).map((c) => c.id)).toEqual([3, 4]);
    expect(visibleChildren({ ...tabs, type: 'container' }, 1)).toHaveLength(3);
  });

  it("gives a container's nested grid the rows below its header", () => {
    expect(innerRows({ type: 'tabs', h: 20 })).toBe(17);
    expect(innerRows({ type: 'container', h: 20 })).toBe(20);
  });

  it("leaves dialogs out of the page's height, and draws containers by their appearance", () => {
    expect(inFlow([{ type: 'modal' }, { type: 'label' }]).map((i) => i.type)).toEqual(['label']);
    expect(containerClass({ appearance: 'Card' })).toBe('container-card');
    expect(containerClass({})).toBe('container-plain');
  });
});
