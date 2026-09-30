import { ComponentId, LayoutItem } from '../_types/layout.types';

const sameId = (a: ComponentId | undefined, b: ComponentId) => a != null && a.toString() === b.toString();

/** Nest flat items under their parents (items without a known parent become roots). */
export function buildLayoutTree(items: LayoutItem[]): LayoutItem[] {
  const byId = new Map<string, LayoutItem>();
  items.forEach((item) => { if (item.id != null) byId.set(item.id.toString(), item); });

  const roots: LayoutItem[] = [];
  for (const item of items) {
    const parent = item.parentId != null ? byId.get(item.parentId.toString()) : undefined;
    if (parent) (parent.children ??= []).push(item);
    else roots.push(item);
  }
  return roots;
}

/** Depth-first search for the item with this id. */
export function findInTree(items: LayoutItem[], id: ComponentId): LayoutItem | null {
  for (const item of items) {
    if (sameId(item.id, id)) return item;
    const found = item.children ? findInTree(item.children, id) : null;
    if (found) return found;
  }
  return null;
}

/** All items of the tree, parents before their children. */
export function flattenTree(items: LayoutItem[]): LayoutItem[] {
  return items.flatMap((item) => [item, ...flattenTree(item.children ?? [])]);
}

/** A copy of the tree with `update` applied to the item with this id. */
export function updateInTree(items: LayoutItem[], id: ComponentId, update: (item: LayoutItem) => LayoutItem): LayoutItem[] {
  return items.map((item) => {
    if (sameId(item.id, id)) return update(item);
    return item.children ? { ...item, children: updateInTree(item.children, id, update) } : item;
  });
}
