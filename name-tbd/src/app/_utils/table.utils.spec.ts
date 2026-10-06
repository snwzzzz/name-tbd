import { parseColumnList, rowMatches, visibleColumnIndexes } from './table.utils';
import { propBool, propNumber } from './widget-props.utils';

describe('parseColumnList', () => {
  it('reads JSON arrays and arrays, and treats anything else as none chosen', () => {
    expect(parseColumnList('["b","a"]')).toEqual(['b', 'a']);
    expect(parseColumnList(['a'])).toEqual(['a']);
    expect(parseColumnList('not json')).toEqual([]);
    expect(parseColumnList('{"a":1}')).toEqual([]);
    expect(parseColumnList(undefined)).toEqual([]);
  });
});

describe('visibleColumnIndexes', () => {
  it('keeps the chosen existing columns in their order, or all when none match', () => {
    expect(visibleColumnIndexes(['a', 'b', 'c'], ['c', 'x', 'a', 'c'])).toEqual([2, 0]);
    expect(visibleColumnIndexes(['a', 'b'], ['x'])).toEqual([0, 1]);
    expect(visibleColumnIndexes(['a', 'b'], [])).toEqual([0, 1]);
  });
});

describe('propBool / propNumber', () => {
  it('reads text props as the backend stores them', () => {
    expect(propBool({ a: 'false' }, 'a', true)).toBe(false);
    expect(propBool({ a: true }, 'a', false)).toBe(true);
    expect(propBool({}, 'a', true)).toBe(true);
    expect(propNumber({ n: '12' }, 'n', 10)).toBe(12);
    expect(propNumber({ n: 'abc' }, 'n', 10)).toBe(10);
  });
});

describe('rowMatches', () => {
  it('matches every word of the search somewhere in the row, ignoring case', () => {
    const row = ['Anna', 'Huber', 'Vienna'];
    expect(rowMatches(row, '')).toBe(true);
    expect(rowMatches(row, '  ')).toBe(true);
    expect(rowMatches(row, 'hub')).toBe(true);
    expect(rowMatches(row, 'ANNA vienna')).toBe(true);
    expect(rowMatches(row, 'anna graz')).toBe(false);
  });
});
