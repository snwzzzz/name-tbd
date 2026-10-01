import { TestBed } from '@angular/core/testing';
import { AddRowHandler } from './add-row.handler';
import { EditRowHandler } from './edit-row.handler';
import { DeleteRowsHandler } from './delete-rows.handler';
import { TableActionsService, TableTarget } from './table-actions.service';
import { APP_DATA } from '../../../ports/app-ports';
import { TableSelectionService } from '../../../services/table-selection.service';
import { ActionRun } from '../../../../_types/workflow.types';

const TARGET: TableTarget = {
  tableId: '7',
  name: 'People',
  dataSourceId: 5,
  multiSelect: true,
  data: { columns: ['name'], rows: [{ id: '0', values: ['Alice'] }, { id: '1', values: ['Bob'] }] },
};

const RUN = { pageId: 'p', node: {} as ActionRun['node'], isCurrent: () => true } as ActionRun;

describe('table row handlers', () => {
  let answer: { row?: string[]; confirmed?: boolean };
  let notices: string[];
  let selected: string[];
  const calls: { add: unknown[][]; update: unknown[][]; delete: unknown[][] } = { add: [], update: [], delete: [] };

  beforeEach(() => {
    answer = {};
    notices = [];
    selected = [];
    calls.add = []; calls.update = []; calls.delete = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TableActionsService,
          useValue: {
            target: async () => TARGET,
            selectedRows: () => TARGET.data.rows.filter((r) => selected.includes(r.id)),
            askForRow: async () => answer.row,
            confirm: async () => !!answer.confirmed,
            notice: async (title: string) => { notices.push(title); },
          },
        },
        {
          provide: APP_DATA,
          useValue: {
            addRow: (...a: unknown[]) => calls.add.push(a),
            updateRow: (...a: unknown[]) => calls.update.push(a),
            deleteRows: (...a: unknown[]) => calls.delete.push(a),
          },
        },
        { provide: TableSelectionService, useValue: { deselect: () => {} } },
      ],
    });
  });

  it('adds the entered row, or stops when the form is cancelled', async () => {
    const handler = TestBed.inject(AddRowHandler);
    expect(await handler.run(RUN)).toBe('stop');

    answer.row = ['Carol'];
    expect(await handler.run(RUN)).toBe('continue');
    expect(calls.add).toEqual([[5, ['Carol']]]);
  });

  it('edits exactly one selected row', async () => {
    const handler = TestBed.inject(EditRowHandler);
    answer.row = ['Alicia'];

    expect(await handler.run(RUN)).toBe('stop');
    selected = ['0', '1'];
    expect(await handler.run(RUN)).toBe('stop');
    expect(notices).toEqual(['No row selected', 'Several rows selected']);

    selected = ['0'];
    expect(await handler.run(RUN)).toBe('continue');
    expect(calls.update).toEqual([[5, '0', ['Alicia']]]);
  });

  it('deletes all selected rows after one confirmation', async () => {
    const handler = TestBed.inject(DeleteRowsHandler);

    expect(await handler.run(RUN)).toBe('stop');
    expect(notices).toEqual(['No row selected']);

    selected = ['0', '1'];
    expect(await handler.run(RUN)).toBe('stop'); // not confirmed
    answer.confirmed = true;
    expect(await handler.run(RUN)).toBe('continue');
    expect(calls.delete).toEqual([[5, ['0', '1']]]);
  });

  it('changes nothing once the run is over (e.g. the preview stopped)', async () => {
    const stopped = { ...RUN, isCurrent: () => false };
    answer.row = ['Carol'];

    expect(await TestBed.inject(AddRowHandler).run(stopped)).toBe('stop');
    expect(calls.add).toEqual([]);
  });
});
