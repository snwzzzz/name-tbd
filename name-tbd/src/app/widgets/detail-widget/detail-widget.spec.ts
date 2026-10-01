import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DetailWidget } from './detail-widget';
import { DataSourceStateService } from '../../_services/data-source-state.service';
import { DetailRecordsService } from '../../_services/detail-records.service';
import { PreviewDataService } from '../../_services/preview-data.service';
import { PreviewSessionService } from '../../_services/preview-session.service';
import { DataSourceDto, DataSourceSummaryDto } from '../../api/models';
import { WidgetProps } from '../../_types/layout.types';

const PEOPLE: DataSourceDto = { id: 5, name: 'People', columns: ['name', 'age', 'city'], rows: [['Alice', '30', 'Bern'], ['Bob', '25', 'Basel']] };

describe('DetailWidget', () => {
  const state = {
    sources: signal<DataSourceSummaryDto[]>([{ id: 5, name: 'People', columns: PEOPLE.columns, rowCount: 2 }]),
    details: signal<Record<number, DataSourceDto>>({ 5: PEOPLE }),
    loaded: signal(true),
    ensureLoaded: () => {},
    ensureDetails: () => {},
  };

  const mount = (props: WidgetProps) => {
    TestBed.configureTestingModule({ providers: [{ provide: DataSourceStateService, useValue: state }] });
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

  it('shows the row sent to it in a preview, with its current values', () => {
    const fixture = mount({ columns: '["name","age"]', emptyText: 'Pick someone' });
    const el: HTMLElement = fixture.nativeElement;
    TestBed.inject(PreviewSessionService).start('1');
    fixture.detectChanges();
    expect(el.textContent).toContain('Pick someone');

    TestBed.inject(DetailRecordsService).show('30', { dataSourceId: 5, rowId: '1' });
    fixture.detectChanges();
    expect(fields(el)).toEqual(['name: Bob', 'age: 25']);

    TestBed.inject(PreviewDataService).updateRow(5, '1', ['Robert', '26', 'Basel']);
    fixture.detectChanges();
    expect(fields(el)).toEqual(['name: Robert', 'age: 26']);

    TestBed.inject(PreviewDataService).deleteRows(5, ['1']);
    fixture.detectChanges();
    expect(el.textContent).toContain('This row was deleted');
  });
});
