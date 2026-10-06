import { Injectable, inject } from '@angular/core';
import { APP_DATA } from '../../../ports/app-ports';
import { TableSelectionService } from '../../../services/table-selection.service';
import { ActionHandler, ActionOutcome, ActionRun } from '../../../../_types/workflow.types';
import { TableActionsService } from './table-actions.service';

/** Table operation `delete_rows`: deletes all selected rows after one confirmation. */
@Injectable({ providedIn: 'root' })
export class DeleteRowsHandler implements ActionHandler {
  private readonly tables = inject(TableActionsService);
  private readonly appData = inject(APP_DATA);
  private readonly selection = inject(TableSelectionService);

  async run(run: ActionRun): Promise<ActionOutcome> {
    const target = await this.tables.target(run);
    if (!target) return 'stop';

    const selected = this.tables.selectedRows(target);
    if (selected.length === 0) {
      await this.tables.notice('No row selected', `Select the rows in “${target.name}” you want to delete.`);
      return 'stop';
    }

    const count = selected.length === 1 ? '1 row' : `${selected.length} rows`;
    const confirmed = await this.tables.confirm(
      `Delete ${count}?`,
      `The selected ${count} will be permanently deleted from “${target.name}”. This can't be undone.`,
      `Delete ${count}`,
    );
    if (!confirmed || !run.isCurrent()) return 'stop';

    const ids = selected.map((row) => row.id);
    if (!(await this.tables.save(() => this.appData.deleteRows(target.dataSourceId, ids)))) return 'stop';
    this.selection.deselect(target.tableId, ids);
    return 'continue';
  }
}
