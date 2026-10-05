import { ChartWidget } from './chart-widget';
import { mountWidget } from '../../core/testing/widget-testing';

const SALES = { id: 5, name: 'Sales', columns: ['month', 'amount'], rows: [['Jan', '10'], ['Feb', '4'], ['Jan', '6']] };

describe('ChartWidget', () => {
  it('draws a bar per label (rows combined), with its data as a table for screen readers', () => {
    const { el } = mountWidget(ChartWidget, { chartType: 'Bar', dataSourceId: '5', labelColumn: 'month', valueColumn: 'amount', combine: 'Sum' }, { data: [SALES] });
    expect(el.querySelectorAll('path.bar')).toHaveLength(2);
    expect([...el.querySelectorAll('tbody tr')].map((r) => r.textContent)).toEqual(['Jan16', 'Feb4']);
    expect(el.querySelector('caption')?.textContent).toContain('Jan: 16, Feb: 4');
  });

  it('draws a line with a point per label, and shows a value on hover', () => {
    const { el, fixture } = mountWidget(ChartWidget, { chartType: 'Line', dataSourceId: '5', labelColumn: 'month', valueColumn: 'amount' }, { data: [SALES] });
    expect(el.querySelector('path.line')?.getAttribute('d')).toMatch(/^M[\d.]+,[\d.]+ L/);
    expect(el.querySelectorAll('circle.dot')).toHaveLength(2);

    el.querySelectorAll('rect.hit')[1].dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(el.querySelector('.tooltip')?.textContent).toContain('Feb');
  });

  it('draws pie slices with a legend of labels, values and shares', () => {
    const { el } = mountWidget(ChartWidget, { chartType: 'Pie', dataSourceId: '5', labelColumn: 'month', valueColumn: 'amount' }, { data: [SALES] });
    expect(el.querySelectorAll('path.slice')).toHaveLength(2);
    expect([...el.querySelectorAll('.legend li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Jan16 · 80%', 'Feb4 · 20%']);
  });

  it('shows sample data while editing a chart without a data source', () => {
    const { el, goLive } = mountWidget(ChartWidget, {});
    expect(el.textContent).toContain('Sample data');
    goLive();
    expect(el.textContent).not.toContain('Sample data');
  });
});
