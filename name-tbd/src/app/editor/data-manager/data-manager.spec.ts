import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DataManager } from './data-manager';
import { DataSourceStateService } from '../../_services/data-source-state.service';
import { OpenDataSourceService } from '../../_services/open-data-source.service';
import { DataSourceDto, DataSourceSummaryDto } from '../../api/models';

const PEOPLE: DataSourceDto = {
  id: 5, name: 'People', format: 'csv', columns: ['name', 'age'], rows: [['Alice', '30'], ['Bob', '']],
};

describe('DataManager', () => {
  const openId = signal<number | null>(null);

  const mount = (sources: DataSourceSummaryDto[]) => {
    openId.set(null);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DataSourceStateService,
          useValue: {
            sources: signal(sources), loading: signal(false), loaded: signal(true), error: signal(null),
            details: signal({ 5: PEOPLE }), ensureLoaded: () => {}, ensureDetails: () => {},
          },
        },
        { provide: OpenDataSourceService, useValue: { id: openId, open: (id: number | null) => openId.set(id) } },
      ],
    });
    const fixture = TestBed.createComponent(DataManager);
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
    return fixture;
  };

  const SOURCES: DataSourceSummaryDto[] = [
    { id: 5, name: 'People', format: 'csv', columns: ['name', 'age'], rowCount: 2 },
    { id: 6, name: 'Orders', format: 'csv', columns: ['id'], rowCount: 40 },
  ];

  it('lists the data sources, opens the first one and shows its dashboard', () => {
    const el: HTMLElement = mount(SOURCES).nativeElement;

    expect([...el.querySelectorAll('.source-name')].map((n) => n.textContent)).toEqual(['People', 'Orders']);
    expect(openId()).toBe(5);
    expect(el.querySelector('.source.selected .source-name')?.textContent).toBe('People');
    expect([...el.querySelectorAll('.stat-value')].map((v) => v.textContent)).toEqual(['2', '2', '75%', '1']);
    expect(el.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('filters the list by name', () => {
    const fixture = mount(SOURCES);
    fixture.componentInstance.query.set('ord');
    fixture.detectChanges();

    expect([...fixture.nativeElement.querySelectorAll('.source-name')].map((n: Element) => n.textContent)).toEqual(['Orders']);
  });

  it('invites to import the first dataset when there are none', () => {
    const el: HTMLElement = mount([]).nativeElement;

    expect(el.querySelector('.welcome')?.textContent).toContain('Connect your first dataset');
    expect(openId()).toBeNull();
  });
});
