import { Injectable, inject } from '@angular/core';
import { APP_DATA } from '../../../ports/app-ports';
import { ActionHandler, ActionOutcome, ActionRun } from '../../../../_types/workflow.types';
import { TableActionsService } from './table-actions.service';

/** Table operation `add_row`: asks for the new row's values, then adds it to the table. Cancelling stops the flow. */
@Injectable({ providedIn: 'root' })
export class AddRowHandler implements ActionHandler {
  private readonly tables = inject(TableActionsService);
  private readonly appData = inject(APP_DATA);

  async run(run: ActionRun): Promise<ActionOutcome> {
    const target = await this.tables.target(run);
    if (!target) return 'stop';

    const values = await this.tables.askForRow(target, `Add row to “${target.name}”`, 'Add row');
    if (!values || !run.isCurrent()) return 'stop';

    this.appData.addRow(target.dataSourceId, values);
    return 'continue';
  }
}
