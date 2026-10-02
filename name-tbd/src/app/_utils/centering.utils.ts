import { Rect, Size } from '../_types/viewport.types';

// Centering widgets in grid cells: in what they're in (the page, or their container's grid).

export type CenterAxis = 'x' | 'y' | 'both';

/**
 * Where a widget goes to sit in the middle of the room on the axis. A widget with an odd number of
 * cells less than the room can't be exactly in the middle: it then sits half a cell left of (or above) it.
 */
export function centeredPosition(widget: Rect, room: Size, axis: CenterAxis): { x: number; y: number } {
  const middle = (size: number, roomSize: number) => Math.max(0, Math.floor((roomSize - size) / 2));
  return {
    x: axis === 'y' ? widget.x : middle(widget.w, room.w),
    y: axis === 'x' ? widget.y : middle(widget.h, room.h),
  };
}

/** On which axes the widget is in the middle of the room: exactly, or as near as its cells allow (half a cell off). */
export function centeredAxes(widget: Rect, room: Size): { x: boolean; y: boolean } {
  // Twice the distance of its center from the room's, in cells
  const off = (start: number, size: number, roomSize: number) => Math.abs(2 * start + size - roomSize);
  return { x: off(widget.x, widget.w, room.w) <= 1, y: off(widget.y, widget.h, room.h) <= 1 };
}
