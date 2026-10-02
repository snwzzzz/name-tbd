import { Rect, Size } from '../_types/viewport.types';

// Finding room for new widgets (pasted copies) in grid cells, without moving anything that's there.

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * How far to move a group of widgets (keeping how they sit to each other) so none of them
 * overlaps what's already there and all stay inside the room: the nearest such place to where they
 * are (at the same distance: below before above, right before left). Null when there's no such place.
 */
export function findFreeSpot(group: Rect[], occupied: Rect[], room: Size): { dx: number; dy: number } | null {
  if (group.length === 0) return { dx: 0, dy: 0 };
  const left = Math.min(...group.map((r) => r.x));
  const top = Math.min(...group.map((r) => r.y));
  const width = Math.max(...group.map((r) => r.x + r.w)) - left;
  const height = Math.max(...group.map((r) => r.y + r.h)) - top;
  if (width > room.w || height > room.h) return null;

  const candidates: { dx: number; dy: number; distance: number }[] = [];
  for (let y = 0; y + height <= room.h; y++) {
    for (let x = 0; x + width <= room.w; x++) {
      const dx = x - left, dy = y - top;
      candidates.push({ dx, dy, distance: dx * dx + dy * dy });
    }
  }
  // Nearest first; at the same distance below before above, then right before left
  candidates.sort((a, b) => a.distance - b.distance || Number(b.dy >= 0) - Number(a.dy >= 0) || Number(b.dx >= 0) - Number(a.dx >= 0));

  const fits = ({ dx, dy }: { dx: number; dy: number }) =>
    group.every((r) => occupied.every((o) => !overlaps({ x: r.x + dx, y: r.y + dy, w: r.w, h: r.h }, o)));
  const spot = candidates.find(fits);
  return spot ? { dx: spot.dx, dy: spot.dy } : null;
}
