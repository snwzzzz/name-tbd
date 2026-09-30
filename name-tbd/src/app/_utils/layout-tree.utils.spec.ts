import { buildLayoutTree, findInTree, flattenTree, updateInTree } from './layout-tree.utils';
import { LayoutItem } from '../_types/layout.types';

describe('layout tree utils', () => {
  const flat: LayoutItem[] = [
    { id: 1, type: 'container' },
    { id: 2, type: 'button', parentId: 1 },
    { id: 3, type: 'label' },
    { id: 4, type: 'label', parentId: 99 },
  ];

  it('nests items under their parents and keeps orphans as roots', () => {
    const tree = buildLayoutTree(flat.map((item) => ({ ...item })));
    expect(tree.map((i) => i.id)).toEqual([1, 3, 4]);
    expect(tree[0].children?.map((i) => i.id)).toEqual([2]);
  });

  it('finds items at any depth, whether the id is a number or a string', () => {
    const tree = buildLayoutTree(flat.map((item) => ({ ...item })));
    expect(findInTree(tree, '2')?.type).toBe('button');
    expect(findInTree(tree, 5)).toBeNull();
  });

  it('flattens parents before their children', () => {
    const tree = buildLayoutTree(flat.map((item) => ({ ...item })));
    expect(flattenTree(tree).map((i) => i.id)).toEqual([1, 2, 3, 4]);
  });

  it('updates one item without mutating the original tree', () => {
    const tree = buildLayoutTree(flat.map((item) => ({ ...item })));
    const updated = updateInTree(tree, 2, (item) => ({ ...item, props: { label: 'New' } }));
    expect(findInTree(updated, 2)?.props).toEqual({ label: 'New' });
    expect(findInTree(tree, 2)?.props).toBeUndefined();
  });
});
