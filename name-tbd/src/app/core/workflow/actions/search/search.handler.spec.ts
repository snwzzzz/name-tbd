import { TestBed } from '@angular/core/testing';
import { SEARCH_ALL_TABLES, SearchHandler } from './search.handler';
import { TableActionsService } from '../table/table-actions.service';
import { InputValuesService } from '../../../services/input-values.service';
import { TableFilterService } from '../../../services/table-filter.service';
import { TableSelectionService } from '../../../services/table-selection.service';
import { APP_DATA } from '../../../ports/app-ports';
import { provideFakeApp } from '../../../testing/fake-app';
import { ActionNode, ActionRun, SearchConfig } from '../../../../_types/workflow.types';
import { DataSourceSnapshot } from '../../../ports/memory-app-data';

const PEOPLE: DataSourceSnapshot = { id: 5, name: 'People', columns: ['name', 'city'], rows: [['Anna', 'Vienna'], ['Bob', 'Graz']] };

const run = (config: SearchConfig): ActionRun =>
  ({ pageId: 'p', node: { config } as ActionNode, isCurrent: () => true }) as ActionRun;

describe('SearchHandler', () => {
  let notices: string[];

  beforeEach(() => {
    notices = [];
    TestBed.configureTestingModule({
      providers: [
        ...provideFakeApp({
          data: [PEOPLE],
          layouts: {
            p: [
              { id: 1, type: 'input' },
              { id: 2, type: 'table', props: { dataSourceId: '5' } },
              { id: 9, type: 'container', children: [{ id: 3, parentId: 9, type: 'table', props: { dataSourceId: '5' } }] },
            ],
          },
        }),
        { provide: TableActionsService, useValue: { notice: async (title: string) => { notices.push(title); } } },
      ],
    });
    TestBed.inject(APP_DATA).ensureTable(5);
  });

  it('filters one table by the input text, and deselects the rows it hides', async () => {
    const selection = TestBed.inject(TableSelectionService);
    const rows = TestBed.inject(APP_DATA).table(5)!.rows;
    selection.ensureSelected('2', rows[1].id, false);
    TestBed.inject(InputValuesService).set('1', 'vien');

    expect(await TestBed.inject(SearchHandler).run(run({ inputId: '1', tableId: '2' }))).toBe('continue');

    const filters = TestBed.inject(TableFilterService);
    expect(filters.query('2')).toBe('vien');
    expect(filters.query('3')).toBe('');
    expect(selection.selected('2')).toEqual([]);
  });

  it('filters every table on the page (containers included) for a global search', async () => {
    TestBed.inject(InputValuesService).set('1', 'bob');
    await TestBed.inject(SearchHandler).run(run({ inputId: '1', tableId: SEARCH_ALL_TABLES }));

    const filters = TestBed.inject(TableFilterService);
    expect([filters.query('2'), filters.query('3')]).toEqual(['bob', 'bob']);
  });

  it('stops, telling why, without an input or a table', async () => {
    const handler = TestBed.inject(SearchHandler);
    expect(await handler.run(run({ inputId: '', tableId: SEARCH_ALL_TABLES }))).toBe('stop');
    expect(await handler.run(run({ inputId: '1', tableId: '77' }))).toBe('stop');
    expect(notices).toEqual(['No input', 'No table']);
  });
});
