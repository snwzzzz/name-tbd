import { describeColumns, inferColumnType } from './data-source.utils';

describe('inferColumnType', () => {
  it('recognizes numbers, booleans and dates, ignoring empty values', () => {
    expect(inferColumnType(['1', '-2.5', '', '1e3'])).toBe('number');
    expect(inferColumnType(['true', 'No', ''])).toBe('boolean');
    expect(inferColumnType(['2024-01-31', '2024-02-01T12:30:00Z'])).toBe('date');
  });

  it('falls back to text when values disagree, and empty when there are none', () => {
    expect(inferColumnType(['1', 'abc'])).toBe('text');
    expect(inferColumnType(['2024-13-45'])).toBe('text');
    expect(inferColumnType(['', ' '])).toBe('empty');
  });
});

describe('describeColumns', () => {
  it('infers each column type and counts filled values', () => {
    const [name, age] = describeColumns(
      ['name', 'age'],
      [
        ['Alice', '30'],
        ['Bob', ''],
        ['Alice', '25'],
      ],
    );

    expect(name).toEqual({ index: 0, name: 'name', type: 'text', filledCount: 3 });
    expect(age.type).toBe('number');
    expect(age.filledCount).toBe(2);
  });
});
