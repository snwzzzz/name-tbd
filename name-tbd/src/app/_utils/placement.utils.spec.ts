import { findFreeSpot } from './placement.utils';

describe('findFreeSpot', () => {
  const room = { w: 20, h: 10 };

  it('puts copies right next to the originals, never on top of anything', () => {
    const button = { x: 2, y: 2, w: 4, h: 2 };
    // Pasted on the same page: the original is in the way, the nearest free place is right below it
    expect(findFreeSpot([button], [button], room)).toEqual({ dx: 0, dy: 2 });
    // The row below taken: right above it
    expect(findFreeSpot([button], [button, { x: 0, y: 4, w: 20, h: 2 }], room)).toEqual({ dx: 0, dy: -2 });
    // Above and below taken: beside it
    expect(findFreeSpot([button], [button, { x: 0, y: 4, w: 20, h: 6 }, { x: 0, y: 0, w: 20, h: 2 }], room)).toEqual({ dx: 4, dy: 0 });
  });

  it('keeps a group together, as it was', () => {
    const group = [{ x: 0, y: 0, w: 4, h: 2 }, { x: 0, y: 2, w: 8, h: 2 }];
    const spot = findFreeSpot(group, group, room)!;
    expect(spot).toEqual({ dx: 0, dy: 4 }); // right below the whole group
  });

  it('keeps the place itself when it is free (e.g. on another page)', () => {
    expect(findFreeSpot([{ x: 3, y: 3, w: 2, h: 2 }], [], room)).toEqual({ dx: 0, dy: 0 });
  });

  it('finds no place when there is no room, rather than stacking', () => {
    const big = { x: 0, y: 0, w: 12, h: 6 };
    expect(findFreeSpot([big], [big], room)).toBeNull();
    expect(findFreeSpot([{ x: 0, y: 0, w: 30, h: 1 }], [], room)).toBeNull();
  });
});
