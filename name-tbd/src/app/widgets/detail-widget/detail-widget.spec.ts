import { TestBed } from '@angular/core/testing';
import { DetailWidget } from './detail-widget';
import { DetailRecordsService } from '../../core/services/detail-records.service';
import { WidgetProps } from '../../_types/layout.types';
import { DataSourceSnapshot } from '../../core/ports/memory-app-data';
import { fakeApp, provideFakeApp } from '../../core/testing/fake-app';

const PEOPLE: DataSourceSnapshot = { id: 5, name: 'People', columns: ['name', 'age', 'city'], rows: [['Alice', '30', 'Bern'], ['Bob', '25', 'Basel']] };

describe('DetailWidget', () => {
  const mount = (props: WidgetProps) => {
    TestBed.configureTestingModule({ providers: provideFakeApp({ data: [PEOPLE] }) });
    const fixture = TestBed.createComponent(DetailWidget);
    fixture.componentRef.setInput('id', '30');
    fixture.componentRef.setInput('props', props);
    fixture.detectChanges();
    return fixture;
  };
  const fields = (el: HTMLElement) =>
    [...el.querySelectorAll('.field')].map((f) => `${f.querySelector('dt')?.textContent}: ${f.querySelector('dd')?.textContent?.trim()}`);

  it("lays out its data source's chosen fields while editing", () => {
    const el: HTMLElement = mount({ title: 'Person', dataSourceId: '5', columns: '["city","name"]' }).nativeElement;

    expect(el.querySelector('.detail-title')?.textContent).toBe('Person');
    expect(fields(el)).toEqual(['city: —', 'name: —']);
  });

  it('shows the row sent to it while the app runs, with its current values', () => {
    const fixture = mount({ columns: '["name","age"]', emptyText: 'Pick someone' });
    const el: HTMLElement = fixture.nativeElement;
    fakeApp().session.start('1');
    fixture.detectChanges();
    expect(el.textContent).toContain('Pick someone');

    TestBed.inject(DetailRecordsService).show('30', { dataSourceId: 5, rowId: '1' });
    fixture.detectChanges();
    expect(fields(el)).toEqual(['name: Bob', 'age: 25']);

    fakeApp().data.updateRow(5, '1', ['Robert', '26', 'Basel']);
    fixture.detectChanges();
    expect(fields(el)).toEqual(['name: Robert', 'age: 26']);

    fakeApp().data.deleteRows(5, ['1']);
    fixture.detectChanges();
    expect(el.textContent).toContain('This row was deleted');
  });
});
