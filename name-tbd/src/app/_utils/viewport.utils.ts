import { Point, Rect, Size } from '../_types/viewport.types';

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** New pan for a zoom change that keeps the point under `anchor` (screen px) in place. */
export function zoomAround(anchor: Point, pan: Point, oldZoom: number, newZoom: number): Point {
  const ratio = newZoom / oldZoom;
  return { x: anchor.x - (anchor.x - pan.x) * ratio, y: anchor.y - (anchor.y - pan.y) * ratio };
}

/**
 * Limit the pan (screen = pan + world × zoom) so at least `keepVisible` px of `bounds`
 * stay inside the viewport on each axis.
 */
export function clampPanToBounds(pan: Point, zoom: number, viewport: Size, bounds: Rect, keepVisible: number): Point {
  const keepX = Math.min(keepVisible, viewport.w / 2);
  const keepY = Math.min(keepVisible, viewport.h / 2);
  return {
    x: clamp(pan.x, keepX - (bounds.x + bounds.w) * zoom, viewport.w - keepX - bounds.x * zoom),
    y: clamp(pan.y, keepY - (bounds.y + bounds.h) * zoom, viewport.h - keepY - bounds.y * zoom),
  };
}

/** The smallest rect containing all of them (null for none). */
export function boundingBox(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.w));
  const maxY = Math.max(...rects.map((r) => r.y + r.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Pan and zoom that center `box` in the viewport with `padding` around it. */
export function fitToViewport(box: Rect, viewport: Size, padding: number, minZoom: number, maxZoom: number): { pan: Point; zoom: number } {
  const zoom = clamp(
    Math.min((viewport.w - padding * 2) / Math.max(box.w, 1), (viewport.h - padding * 2) / Math.max(box.h, 1)),
    minZoom,
    maxZoom,
  );
  return {
    zoom,
    pan: { x: (viewport.w - box.w * zoom) / 2 - box.x * zoom, y: (viewport.h - box.h * zoom) / 2 - box.y * zoom },
  };
}
