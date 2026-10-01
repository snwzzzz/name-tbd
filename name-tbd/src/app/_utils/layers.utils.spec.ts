import { layerDetail, layerTypeName, sortLayers } from './layers.utils';

describe('layers utils', () => {
  it('names widgets by their type, falling back to the palette label', () => {
    expect(layerTypeName({ type: 'button' })).toBe('Button');
    expect(layerTypeName({ type: 'container' })).toBe('Container');
    expect(layerTypeName({ type: 'mystery' })).toBe('Unknown Widget');
  });

  it('describes a widget by its title, label or text', () => {
    expect(layerDetail({ props: { label: 'Save', text: 'x' } })).toBe('Save');
    expect(layerDetail({ props: { title: '' } })).toBeUndefined();
  });

  it('sorts top to bottom, then left to right, children included', () => {
    const sorted = sortLayers([
      { id: 1, y: 2, x: 0 },
      { id: 2, y: 0, x: 5, children: [{ id: 4, y: 1, x: 0 }, { id: 3, y: 0, x: 0 }] },
      { id: 5, y: 0, x: 1 },
    ]);
    expect(sorted.map((i) => i.id)).toEqual([5, 2, 1]);
    expect(sorted[1].children?.map((i) => i.id)).toEqual([3, 4]);
  });
});
