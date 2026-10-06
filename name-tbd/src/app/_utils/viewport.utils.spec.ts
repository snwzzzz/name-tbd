import { blueprintGridStyle, boundingBox, clampPanToBounds, fitToViewport, zoomAround } from './viewport.utils';
import { BACKDROP_GRID_MAJOR, BACKDROP_GRID_MINOR } from '../_constants/artboard.constants';

describe('viewport utils', () => {
  it('keeps the point under the anchor in place when zooming', () => {
    const anchor = { x: 100, y: 50 };
    const pan = zoomAround(anchor, { x: 0, y: 0 }, 1, 2);
    // world point under the anchor before: (100, 50); after: (anchor - pan) / zoom
    expect((anchor.x - pan.x) / 2).toBe(100);
    expect((anchor.y - pan.y) / 2).toBe(50);
  });

  it('keeps part of the bounds on screen', () => {
    const bounds = { x: 0, y: 0, w: 1000, h: 1000 };
    const viewport = { w: 800, h: 600 };
    // Panned far to the right: the bounds' left edge may go at most (viewport - keep) px in
    expect(clampPanToBounds({ x: 5000, y: 0 }, 1, viewport, bounds, 100).x).toBe(700);
    // Panned far to the left: at least 100px of the bounds' right side stays visible
    expect(clampPanToBounds({ x: -5000, y: 0 }, 1, viewport, bounds, 100).x).toBe(-900);
  });

  it('computes the bounding box of rects', () => {
    expect(boundingBox([{ x: 0, y: 10, w: 5, h: 5 }, { x: -5, y: 0, w: 5, h: 5 }])).toEqual({ x: -5, y: 0, w: 10, h: 15 });
    expect(boundingBox([])).toBeNull();
  });

  it('fits a box into the viewport, centered, within the zoom limits', () => {
    const { pan, zoom } = fitToViewport({ x: 0, y: 0, w: 100, h: 100 }, { w: 400, h: 200 }, 0, 0.1, 1);
    expect(zoom).toBe(1);
    expect(pan).toEqual({ x: 150, y: 50 });
  });
});

describe('blueprintGridStyle', () => {
  it('scales the grid with the zoom and places it from the top-left corner', () => {
    const style = blueprintGridStyle({ x: 30, y: -10 }, 2, 'top-left');

    expect(style['--grid-major-size']).toBe(`${BACKDROP_GRID_MAJOR * 2}px`);
    expect(style['--grid-minor-size']).toBe(`${BACKDROP_GRID_MINOR * 2}px`);
    expect(style['--grid-major-position']).toBe('30px -10px');
    expect(style['--grid-minor-color']).toBe('var(--canvas-grid-minor)');
  });

  it('places it from the center (offset by half a tile), and drops fine lines when zoomed far out', () => {
    const style = blueprintGridStyle({ x: -720, y: -360 }, 0.25, 'center');

    expect(style['--grid-major-position']).toBe('calc(50% + -705px) calc(50% + -345px)');
    expect(style['--grid-minor-color']).toBe('transparent');
  });
});
