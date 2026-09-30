import { Injectable, inject } from '@angular/core';
import { PreviewDataService } from '../../_services/preview-data.service';
import { ActionHandler, ActionOutcome, ActionRun } from '../../_types/workflow.types';
import { TableActionsService } from './table-actions.service';

/** Table operation `add_row`: asks for the new row's values, then adds it to the table. Cancelling stops the flow. */
@Injectable({ providedIn: 'root' })
export class AddRowHandler implements ActionHandler {
  private readonly tables = inject(TableActionsService);
  private readonly previewData = inject(PreviewDataService);

  async run(run: ActionRun): Promise<ActionOutcome> {
    const target = await this.tables.target(run);
    if (!target) return 'stop';

    const values = await this.tables.askForRow(target, `Add row to “${target.name}”`, 'Add row');
    if (!values || !run.isCurrent()) return 'stop';

    this.previewData.addRow(target.dataSourceId, values);
    return 'continue';
  }
}
