import { chartPoints, foldSmallest, niceScale } from './chart-data';
import { TableData } from '../../_types/data-source.types';

const SALES: TableData = {
  columns: ['region', 'amount'],
  rows: [
    { id: '1', values: ['North', '10'] },
    { id: '2', values: ['South', '4'] },
    { id: '3', values: ['North', '€6'] },
    { id: '4', values: ['East', 'n/a'] },
  ],
};

describe('chart data', () => {
  it('combines rows with the same label', () => {
    expect(chartPoints(SALES, 0, 1, 'Sum')).toEqual([{ label: 'North', value: 16 }, { label: 'South', value: 4 }, { label: 'East', value: 0 }]);
    expect(chartPoints(SALES, 0, 1, 'Average')[0]).toEqual({ label: 'North', value: 8 });
    expect(chartPoints(SALES, 0, 1, 'Count')[0]).toEqual({ label: 'North', value: 2 });
    expect(chartPoints(SALES, 0, 1, 'Show each')).toHaveLength(4);
  });

  it('counts rows when there is no value column', () => {
    expect(chartPoints(SALES, 0, -1, 'Sum')).toEqual([{ label: 'North', value: 2 }, { label: 'South', value: 1 }, { label: 'East', value: 1 }]);
  });

  it('folds the smallest points into "Other"', () => {
    const points = [{ label: 'a', value: 5 }, { label: 'b', value: 1 }, { label: 'c', value: 9 }, { label: 'd', value: 2 }];
    expect(foldSmallest(points, 3)).toEqual([{ label: 'a', value: 5 }, { label: 'c', value: 9 }, { label: 'Other', value: 3 }]);
  });

  it('picks round axis steps', () => {
    expect(niceScale(16)).toEqual({ max: 20, step: 5 });
    expect(niceScale(0)).toEqual({ max: 1, step: 0.25 });
  });
});
