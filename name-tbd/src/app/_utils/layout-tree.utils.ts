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

/** A copy of the tree without the items with these ids (and what's inside them). */
export function removeFromTree(items: LayoutItem[], ids: ComponentId[]): LayoutItem[] {
  return items
    .filter((item) => !ids.some((id) => sameId(item.id, id)))
    .map((item) => (item.children ? { ...item, children: removeFromTree(item.children, ids) } : item));
}

/** A copy of the tree with the item added to its parent's children (`item.parentId`), or at the top. */
export function insertIntoTree(items: LayoutItem[], item: LayoutItem): LayoutItem[] {
  if (item.parentId != null && findInTree(items, item.parentId)) {
    return updateInTree(items, item.parentId, (parent) => ({ ...parent, children: [...(parent.children ?? []), item] }));
  }
  return [...items, item];
}
