import { align, distribute, moveGroup, PlacedRect } from './align.utils';

const rect = (id: string, x: number, y: number, w: number, h: number): PlacedRect => ({ id, x, y, w, h });
const xs = (items: PlacedRect[]) => items.map((i) => i.x);
const ys = (items: PlacedRect[]) => items.map((i) => i.y);

describe('align', () => {
  // a: cells 2–5, b: 10–13, c: 6–15 (x); rows 1–2, 8–11, 4–4 (y)
  const items = [rect('a', 2, 1, 4, 2), rect('b', 10, 8, 4, 4), rect('c', 6, 4, 10, 1)];

  it('lines up left, right and horizontal centers in the selection’s box', () => {
    expect(xs(align(items, 'left'))).toEqual([2, 2, 2]);
    expect(xs(align(items, 'right'))).toEqual([12, 12, 6]);
    // Box 2–16 (14 cells): a 4-wide widget's middle place is 7, the 10-wide one's 4
    expect(xs(align(items, 'centerX'))).toEqual([7, 7, 4]);
  });

  it('lines up top, bottom and vertical centers, keeping the other axis', () => {
    expect(ys(align(items, 'top'))).toEqual([1, 1, 1]);
    expect(ys(align(items, 'bottom'))).toEqual([10, 8, 11]);
    // Box rows 1–12 (11 rows): a 1-row widget's middle place is 6
    expect(ys(align(items, 'centerY'))).toEqual([5, 4, 6]);
    expect(xs(align(items, 'top'))).toEqual([2, 10, 6]);
  });

  it('leaves a single widget alone', () => {
    expect(align([rect('a', 3, 3, 2, 2)], 'left')).toEqual([rect('a', 3, 3, 2, 2)]);
  });
});

describe('distribute', () => {
  it('gives the widgets between the first and last equal gaps, in any order given', () => {
    // From 0 to 30: widths 4 + 4 + 4 = 12, so 18 cells for 2 gaps of 9
    const items = [rect('c', 26, 0, 4, 1), rect('a', 0, 0, 4, 1), rect('b', 5, 0, 4, 1)];
    expect(xs(distribute(items, 'horizontal'))).toEqual([26, 0, 13]);
  });

  it('rounds uneven gaps to whole cells, and works vertically', () => {
    // From 0 to 10: heights 2 + 2 + 2 + 2 = 8, so 2 cells for 3 gaps (2/3 each)
    const items = [rect('a', 0, 0, 1, 2), rect('b', 0, 2, 1, 2), rect('c', 0, 5, 1, 2), rect('d', 0, 8, 1, 2)];
    expect(ys(distribute(items, 'vertical'))).toEqual([0, 3, 5, 8]);
  });

  it('needs three widgets', () => {
    const two = [rect('a', 0, 0, 2, 1), rect('b', 9, 0, 2, 1)];
    expect(distribute(two, 'horizontal')).toEqual(two);
  });
});

describe('moveGroup', () => {
  const room = { w: 20, h: 10 };
  const items = [rect('a', 2, 2, 4, 2), rect('b', 10, 5, 4, 2)];

  it('moves every widget by the offset', () => {
    expect(moveGroup(items, 3, -1, room).map((i) => [i.x, i.y])).toEqual([[5, 1], [13, 4]]);
  });

  it('stops the whole group at the room’s edges, keeping its arrangement', () => {
    // b can go 6 cells right and 3 down; a 2 left and 2 up
    expect(moveGroup(items, 10, 10, room).map((i) => [i.x, i.y])).toEqual([[8, 5], [16, 8]]);
    expect(moveGroup(items, -10, -10, room).map((i) => [i.x, i.y])).toEqual([[0, 0], [8, 3]]);
  });
});
