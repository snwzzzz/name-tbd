import { Rect, Size } from '../_types/viewport.types';

// Aligning and distributing widgets, and moving several at once, in grid cells. All widgets given
// are in the same grid (the page's, or one container's); positions stay whole cells.

export type AlignEdge = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';
export type DistributeAxis = 'horizontal' | 'vertical';

export interface PlacedRect extends Rect {
  id: string;
}

/** Where each widget goes to line up with the others' bounding box on that edge (or center line). */
export function align(items: PlacedRect[], edge: AlignEdge): PlacedRect[] {
  if (items.length < 2) return items;
  const left = Math.min(...items.map((i) => i.x));
  const right = Math.max(...items.map((i) => i.x + i.w));
  const top = Math.min(...items.map((i) => i.y));
  const bottom = Math.max(...items.map((i) => i.y + i.h));
  // Centered in the box; an odd leftover cell goes to the right (or below)
  const middle = (start: number, end: number, size: number) => start + Math.floor((end - start - size) / 2);

  return items.map((item) => {
    switch (edge) {
      case 'left': return { ...item, x: left };
      case 'right': return { ...item, x: right - item.w };
      case 'centerX': return { ...item, x: middle(left, right, item.w) };
      case 'top': return { ...item, y: top };
      case 'bottom': return { ...item, y: bottom - item.h };
      case 'centerY': return { ...item, y: middle(top, bottom, item.h) };
    }
  });
}

/**
 * Spaces the widgets evenly along the axis: the first and last (by position) stay, the ones between
 * get equal gaps (rounded to whole cells). Needs three or more to change anything.
 */
export function distribute(items: PlacedRect[], axis: DistributeAxis): PlacedRect[] {
  if (items.length < 3) return items;
  const start = (i: PlacedRect) => (axis === 'horizontal' ? i.x : i.y);
  const size = (i: PlacedRect) => (axis === 'horizontal' ? i.w : i.h);
  const sorted = [...items].sort((a, b) => start(a) - start(b) || size(a) - size(b));

  const first = sorted[0], last = sorted[sorted.length - 1];
  const span = start(last) + size(last) - start(first);
  const sizes = sorted.reduce((sum, i) => sum + size(i), 0);
  const gap = (span - sizes) / (sorted.length - 1);

  const placed = new Map<string, number>();
  let used = 0;
  sorted.forEach((item, index) => {
    placed.set(item.id, index === sorted.length - 1 ? start(last) : Math.round(start(first) + used + index * gap));
    used += size(item);
  });
  return items.map((item) => (axis === 'horizontal' ? { ...item, x: placed.get(item.id)! } : { ...item, y: placed.get(item.id)! }));
}

/**
 * Moves widgets by an offset (the cells the dragged widget moved), as a group: the offset is cut
 * short where one of them would leave the room, so they keep their arrangement.
 */
export function moveGroup(items: PlacedRect[], dx: number, dy: number, room: Size): PlacedRect[] {
  if (items.length === 0) return items;
  const clamp = (offset: number, min: number, max: number) => Math.min(Math.max(offset, min), max);
  const x = clamp(dx, Math.max(...items.map((i) => -i.x)), Math.min(...items.map((i) => room.w - i.w - i.x)));
  const y = clamp(dy, Math.max(...items.map((i) => -i.y)), Math.min(...items.map((i) => room.h - i.h - i.y)));
  return items.map((item) => ({ ...item, x: item.x + x, y: item.y + y }));
}
