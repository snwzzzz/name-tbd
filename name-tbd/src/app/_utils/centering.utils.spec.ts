import { centeredAxes, centeredPosition } from './centering.utils';

const PAGE = { w: 128, h: 63 };

describe('centering utils', () => {
  it('moves a widget to the middle on one axis or both', () => {
    const button = { x: 3, y: 4, w: 8, h: 3 };
    expect(centeredPosition(button, PAGE, 'x')).toEqual({ x: 60, y: 4 });
    expect(centeredPosition(button, PAGE, 'y')).toEqual({ x: 3, y: 30 });
    expect(centeredPosition(button, PAGE, 'both')).toEqual({ x: 60, y: 30 });
    // Odd room left: half a cell left of the middle; never off the room
    expect(centeredPosition({ x: 0, y: 0, w: 7, h: 3 }, PAGE, 'x').x).toBe(60);
    expect(centeredPosition({ x: 0, y: 0, w: 200, h: 3 }, PAGE, 'x').x).toBe(0);
  });

  it('tells on which axes a widget is centered, as near as its cells allow', () => {
    expect(centeredAxes({ x: 60, y: 30, w: 8, h: 3 }, PAGE)).toEqual({ x: true, y: true });
    expect(centeredAxes({ x: 60, y: 0, w: 7, h: 3 }, PAGE)).toEqual({ x: true, y: false });
    expect(centeredAxes({ x: 61, y: 30, w: 7, h: 3 }, PAGE)).toEqual({ x: true, y: true });
    expect(centeredAxes({ x: 59, y: 29, w: 8, h: 3 }, PAGE)).toEqual({ x: false, y: false });
  });
});
