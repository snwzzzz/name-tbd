import { Point, Rect, Size } from '../_types/viewport.types';
import { BACKDROP_GRID_MAJOR, BACKDROP_GRID_MIN_VISIBLE, BACKDROP_GRID_MINOR } from '../_constants/artboard.constants';

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

/**
 * The style that places the blueprint grid (see _blueprint-grid.scss) so it pans and zooms along:
 * `origin` is where a major line crossing sits on screen, in px from the element's center or
 * top-left corner. Minor lines fade out when they'd be too close together to tell apart.
 */
export function blueprintGridStyle(origin: Point, zoom: number, relativeTo: 'center' | 'top-left'): Record<string, string> {
  const major = BACKDROP_GRID_MAJOR * zoom;
  const minor = BACKDROP_GRID_MINOR * zoom;
  // A background-position of `calc(50% + d)` puts a tile of size s at center - s/2 + d
  const at = (size: number) =>
    relativeTo === 'center'
      ? `calc(50% + ${origin.x + size / 2}px) calc(50% + ${origin.y + size / 2}px)`
      : `${origin.x}px ${origin.y}px`;
  return {
    '--grid-major-size': `${major}px`,
    '--grid-minor-size': `${minor}px`,
    '--grid-major-position': at(major),
    '--grid-minor-position': at(minor),
    '--grid-minor-color': minor < BACKDROP_GRID_MIN_VISIBLE ? 'transparent' : 'var(--canvas-grid-minor)',
  };
}
