import { Injectable, inject } from '@angular/core';
import { APP_DATA } from '../../../ports/app-ports';
import { ActionHandler, ActionOutcome, ActionRun } from '../../../../_types/workflow.types';
import { TableActionsService } from './table-actions.service';

/** Table operation `edit_row`: edits the one selected row in a form filled with its values. */
@Injectable({ providedIn: 'root' })
export class EditRowHandler implements ActionHandler {
  private readonly tables = inject(TableActionsService);
  private readonly appData = inject(APP_DATA);

  async run(run: ActionRun): Promise<ActionOutcome> {
    const target = await this.tables.target(run);
    if (!target) return 'stop';

    const selected = this.tables.selectedRows(target);
    if (selected.length !== 1) {
      await this.tables.notice(
        selected.length === 0 ? 'No row selected' : 'Several rows selected',
        `Select exactly one row in “${target.name}” to edit it.`,
      );
      return 'stop';
    }

    const [row] = selected;
    const values = await this.tables.askForRow(target, `Edit row in “${target.name}”`, 'Save', row.values);
    if (!values || !run.isCurrent()) return 'stop';

    this.appData.updateRow(target.dataSourceId, row.id, values);
    return 'continue';
  }
}
