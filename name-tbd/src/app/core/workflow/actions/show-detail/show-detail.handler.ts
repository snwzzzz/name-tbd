import { Injectable, inject } from '@angular/core';
import { DetailRecordsService } from '../../../services/detail-records.service';
import { APP_NAVIGATION } from '../../../ports/app-ports';
import { ActionHandler, ActionOutcome, ActionRun, ShowDetailConfig } from '../../../../_types/workflow.types';
import { TableActionsService } from '../table/table-actions.service';

/**
 * `show_detail`: shows the row selected in a table in a detail section, and opens the detail's
 * page when it's another one (the preview goes on there).
 */
@Injectable({ providedIn: 'root' })
export class ShowDetailHandler implements ActionHandler {
  private readonly tables = inject(TableActionsService);
  private readonly records = inject(DetailRecordsService);
  private readonly navigation = inject(APP_NAVIGATION);

  async run(run: ActionRun): Promise<ActionOutcome> {
    const config = run.node.config as ShowDetailConfig;
    if (!config.detailId) {
      await this.tables.notice('No detail section', 'This action has no detail section. Pick one in the workflow editor.');
      return 'stop';
    }

    const target = await this.tables.target(run);
    if (!target) return 'stop';

    const selected = this.tables.selectedRows(target);
    if (selected.length !== 1) {
      await this.tables.notice(
        selected.length === 0 ? 'No row selected' : 'Several rows selected',
        `Select exactly one row in “${target.name}” to show its details.`,
      );
      return 'stop';
    }
    if (!run.isCurrent()) return 'stop';

    this.records.show(config.detailId, { dataSourceId: target.dataSourceId, rowId: selected[0].id });
    if (config.detailPageId && config.detailPageId !== run.pageId) {
      this.navigation.openPage(Number(config.detailPageId));
    }
    return 'continue';
  }
}
