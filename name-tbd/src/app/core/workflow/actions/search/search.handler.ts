import { Injectable, inject } from '@angular/core';
import { APP_DATA, APP_LAYOUT } from '../../../ports/app-ports';
import { InputValuesService } from '../../../services/input-values.service';
import { TableFilterService } from '../../../services/table-filter.service';
import { TableSelectionService } from '../../../services/table-selection.service';
import { TableActionsService } from '../table/table-actions.service';
import { ActionHandler, ActionOutcome, ActionRun, SearchConfig } from '../../../../_types/workflow.types';
import { LayoutItem } from '../../../../_types/layout.types';
import { flattenTree } from '../../../../_utils/layout-tree.utils';
import { propNumber } from '../../../../_utils/widget-props.utils';
import { parseColumnList, rowMatches, visibleColumnIndexes } from '../../../../_utils/table.utils';
import { isRowWidget } from '../../../rendering/row-widgets';

/** The search's `tableId` for "every data table on the page" (a global search bar). */
export const SEARCH_ALL_TABLES = 'all';

/**
 * `search`: filters a data table, or every table on the page, by what's typed into an input (empty:
 * all rows again). Rows the search hides are deselected, so actions can't act on rows nobody sees.
 * The input is found by its id, so it can be on another page, e.g. the layout page's header.
 */
@Injectable({ providedIn: 'root' })
export class SearchHandler implements ActionHandler {
  private readonly layout = inject(APP_LAYOUT);
  private readonly appData = inject(APP_DATA);
  private readonly inputs = inject(InputValuesService);
  private readonly filters = inject(TableFilterService);
  private readonly selection = inject(TableSelectionService);
  private readonly tables = inject(TableActionsService);

  async run(run: ActionRun): Promise<ActionOutcome> {
    const config = run.node.config as SearchConfig;
    if (!config.inputId) {
      await this.tables.notice('No input', 'This search has no input. Pick one in the workflow editor.');
      return 'stop';
    }
    const targets = this.targetTables(run.pageId, config.tableId);
    if (targets.length === 0) {
      await this.tables.notice('No table', 'This search has no table to filter. Pick one in the workflow editor.');
      return 'stop';
    }
    if (!run.isCurrent()) return 'stop';

    const query = this.inputs.value(config.inputId);
    for (const table of targets) {
      const tableId = String(table.id);
      this.filters.set(tableId, query);
      this.selection.deselect(tableId, this.hiddenRowIds(table, query));
    }
    return 'continue';
  }

  private targetTables(pageId: string, tableId: string): LayoutItem[] {
    const tables = flattenTree(this.layout.items(pageId)).filter((item) => isRowWidget(item.type) && item.id != null);
    return tableId === SEARCH_ALL_TABLES ? tables : tables.filter((item) => String(item.id) === tableId);
  }

  /** The table's rows the search doesn't match (searched in the columns it shows, like the table does). */
  private hiddenRowIds(table: LayoutItem, query: string): string[] {
    const data = this.appData.table(propNumber(table.props, 'dataSourceId', NaN));
    if (!data) return [];
    const columns = visibleColumnIndexes(data.columns, parseColumnList(table.props?.['columns']));
    return data.rows
      .filter((row) => !rowMatches(columns.map((i) => row.values[i] ?? ''), query))
      .map((row) => row.id);
  }
}
