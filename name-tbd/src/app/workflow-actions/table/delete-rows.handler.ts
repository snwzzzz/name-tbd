import { Injectable, inject } from '@angular/core';
import { PreviewDataService } from '../../_services/preview-data.service';
import { TableSelectionService } from '../../_services/table-selection.service';
import { ActionHandler, ActionOutcome, ActionRun } from '../../_types/workflow.types';
import { TableActionsService } from './table-actions.service';

/** Table operation `delete_rows`: deletes all selected rows after one confirmation. */
@Injectable({ providedIn: 'root' })
export class DeleteRowsHandler implements ActionHandler {
  private readonly tables = inject(TableActionsService);
  private readonly previewData = inject(PreviewDataService);
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
    this.previewData.deleteRows(target.dataSourceId, ids);
    this.selection.deselect(target.tableId, ids);
    return 'continue';
  }
}
