import { TestBed } from '@angular/core/testing';
import { ShowDetailHandler } from './show-detail.handler';
import { TableActionsService, TableTarget } from '../table/table-actions.service';
import { DetailRecordsService } from '../../../services/detail-records.service';
import { APP_NAVIGATION } from '../../../ports/app-ports';
import { ActionRun, ShowDetailConfig } from '../../../../_types/workflow.types';

const TARGET: TableTarget = {
  tableId: '7',
  name: 'People',
  dataSourceId: 5,
  multiSelect: true,
  data: { columns: ['name'], rows: [{ id: '0', values: ['Alice'] }, { id: '1', values: ['Bob'] }] },
};

const run = (config: Partial<ShowDetailConfig>): ActionRun =>
  ({
    pageId: '1',
    node: { config: { tableId: '7', detailId: '30', detailPageId: '1', ...config } },
    isCurrent: () => true,
  }) as unknown as ActionRun;

describe('ShowDetailHandler', () => {
  let selected: string[];
  let notices: string[];
  let opened: number[];

  beforeEach(() => {
    selected = [];
    notices = [];
    opened = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TableActionsService,
          useValue: {
            target: async () => TARGET,
            selectedRows: () => TARGET.data.rows.filter((r) => selected.includes(r.id)),
            notice: async (title: string) => { notices.push(title); },
          },
        },
        { provide: APP_NAVIGATION, useValue: { openPage: (id: number) => opened.push(id) } },
      ],
    });
  });

  it('shows the selected row in a detail section on the same page', async () => {
    selected = ['1'];

    expect(await TestBed.inject(ShowDetailHandler).run(run({}))).toBe('continue');
    expect(TestBed.inject(DetailRecordsService).record('30')).toEqual({ dataSourceId: 5, rowId: '1' });
    expect(opened).toEqual([]);
  });

  it("opens the detail section's page when it's another one", async () => {
    selected = ['0'];

    await TestBed.inject(ShowDetailHandler).run(run({ detailPageId: '4' }));
    expect(opened).toEqual([4]);
  });

  it('needs exactly one selected row and a detail section', async () => {
    const handler = TestBed.inject(ShowDetailHandler);

    expect(await handler.run(run({}))).toBe('stop');
    selected = ['0', '1'];
    expect(await handler.run(run({}))).toBe('stop');
    expect(await handler.run(run({ detailId: '' }))).toBe('stop');
    expect(notices).toEqual(['No row selected', 'Several rows selected', 'No detail section']);
    expect(TestBed.inject(DetailRecordsService).record('30')).toBeNull();
  });
});
