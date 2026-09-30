import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TableWidget } from './table-widget';
import { DataSourceStateService } from '../../_services/data-source-state.service';
import { DataSourceDto, DataSourceSummaryDto } from '../../api/models';
import { WidgetProps } from '../../_types/layout.types';
import { PreviewSessionService } from '../../_services/preview-session.service';
import { PreviewDataService } from '../../_services/preview-data.service';

const PEOPLE: DataSourceDto = {
  id: 5,
  name: 'People',
  columns: ['name', 'age', 'city'],
  rows: [
    ['Alice', '30', 'Bern'],
    ['Bob', '25', 'Basel'],
    ['Carol', '41', 'Chur'],
  ],
};

describe('TableWidget', () => {
  const state = {
    sources: signal<DataSourceSummaryDto[]>([{ id: 5, name: 'People', columns: PEOPLE.columns, rowCount: 3 }]),
    details: signal<Record<number, DataSourceDto>>({ 5: PEOPLE }),
    loaded: signal(true),
    ensureLoaded: () => {},
    ensureDetails: () => {},
  };

  const mount = (props: WidgetProps) => {
    TestBed.configureTestingModule({ providers: [{ provide: DataSourceStateService, useValue: state }] });
    const fixture = TestBed.createComponent(TableWidget);
    fixture.componentRef.setInput('id', '1');
    fixture.componentRef.setInput('props', props);
    fixture.detectChanges();
    return fixture;
  };
  const render = (props: WidgetProps): HTMLElement => mount(props).nativeElement;

  const texts = (el: HTMLElement, selector: string) => [...el.querySelectorAll(selector)].map((e) => e.textContent?.trim());

  it('shows the chosen columns in their order and limits the rows', () => {
    const el = render({ title: 'Team', dataSourceId: '5', columns: '["city","name"]', maxRows: '2', showHeader: 'true' });

    expect(el.querySelector('.table-title')?.textContent).toContain('Team');
    expect(texts(el, 'th')).toEqual(['city', 'name']);
    expect(texts(el, 'tbody tr:first-child td')).toEqual(['Bern', 'Alice']);
    expect(el.querySelectorAll('tbody tr').length).toBe(2);
    expect(el.textContent).toContain('+ 1 more rows');
  });

  it('shows all columns when none are chosen, and can hide the header', () => {
    const el = render({ dataSourceId: '5', columns: '[]', showHeader: 'false' });

    expect(el.querySelector('thead')).toBeNull();
    expect(texts(el, 'tbody tr:first-child td')).toEqual(['Alice', '30', 'Bern']);
  });

  it('explains a missing or unknown data source', () => {
    expect(render({ dataSourceId: '' }).textContent).toContain('Pick a data source');
    TestBed.resetTestingModule();
    expect(render({ dataSourceId: '9' }).textContent).toContain('Data source not found');
  });

  it('selects rows by clicking them only while previewing, and shows the preview copy', () => {
    const fixture = mount({ dataSourceId: '5', multiSelect: 'true' });
    const el: HTMLElement = fixture.nativeElement;
    const click = (i: number) => {
      (el.querySelectorAll('tbody tr')[i] as HTMLElement).click();
      fixture.detectChanges();
    };

    click(0);
    expect(el.querySelectorAll('tr.selected').length).toBe(0);

    TestBed.inject(PreviewSessionService).start('page');
    TestBed.inject(PreviewDataService).addRow(5, ['Dave', '50', 'Aarau']);
    fixture.detectChanges();
    click(0);
    click(2);
    expect(el.querySelectorAll('tr.selected').length).toBe(2);
    expect(el.querySelectorAll('tbody tr').length).toBe(4);

    TestBed.inject(PreviewSessionService).stop();
    fixture.detectChanges();
    expect(el.querySelectorAll('tr.selected').length).toBe(0);
    expect(el.querySelectorAll('tbody tr').length).toBe(3);
  });
});
