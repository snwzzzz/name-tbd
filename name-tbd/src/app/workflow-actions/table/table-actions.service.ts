import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LayoutStateService } from '../../_services/layout-state.service';
import { DataSourceStateService } from '../../_services/data-source-state.service';
import { PreviewDataService } from '../../_services/preview-data.service';
import { TableSelectionService } from '../../_services/table-selection.service';
import { ModalService } from '../../_services/modal/modal.service';
import { RowFormField, RowFormModal, RowFormModalData } from '../../components/row-form-modal/row-form-modal';
import { ActionRun, TableActionConfig } from '../../_types/workflow.types';
import { TableData, TableRow } from '../../_types/data-source.types';
import { findInTree } from '../../_utils/layout-tree.utils';
import { propBool, propNumber, propText } from '../../_utils/widget-props.utils';
import { describeColumns } from '../../_utils/data-source.utils';

/** The data table an action works on, with the preview's data. */
export interface TableTarget {
  tableId: string;
  name: string;
  dataSourceId: number;
  data: TableData;
  multiSelect: boolean;
}

/** What the table actions (add / edit / delete rows) share: finding their table, selection, modals. */
@Injectable({ providedIn: 'root' })
export class TableActionsService {
  private readonly layoutState = inject(LayoutStateService);
  private readonly dataSources = inject(DataSourceStateService);
  private readonly previewData = inject(PreviewDataService);
  private readonly selection = inject(TableSelectionService);
  private readonly modal = inject(ModalService);

  /** The action's table and its data; null (after telling the user why) when there's none to act on. */
  async target({ pageId, node }: ActionRun): Promise<TableTarget | null> {
    const { tableId } = node.config as TableActionConfig;
    const item = tableId ? findInTree(this.layoutState.getLayout(pageId), tableId) : null;
    if (item?.type !== 'table') {
      await this.notice('No table', 'This action has no table. Pick one in the workflow editor.');
      return null;
    }

    const name = propText(item.props, 'title') ?? `Table #${item.id}`;
    const dataSourceId = propNumber(item.props, 'dataSourceId', NaN);
    if (!Number.isInteger(dataSourceId)) {
      await this.notice('No data', `“${name}” has no data source yet.`);
      return null;
    }
    try {
      await this.dataSources.loadDetails(dataSourceId);
    } catch {
      await this.notice('No data', `The data of “${name}” couldn't be loaded.`);
      return null;
    }

    return {
      tableId: String(item.id),
      name,
      dataSourceId,
      data: this.previewData.table(dataSourceId)!,
      multiSelect: propBool(item.props, 'multiSelect', false),
    };
  }

  /** The table's selected rows that still exist. */
  selectedRows(target: TableTarget): TableRow[] {
    const ids = this.selection.selected(target.tableId);
    return target.data.rows.filter((row) => ids.includes(row.id));
  }

  /** Asks for a row's values; resolves to them, or undefined when cancelled. */
  async askForRow(target: TableTarget, title: string, submitText: string, values: string[] = []): Promise<string[] | undefined> {
    const fields: RowFormField[] = describeColumns(target.data.columns, target.data.rows.map((r) => r.values))
      .map((column) => ({ name: column.name, type: column.type }));
    const ref = this.modal.open<RowFormModal, RowFormModalData, string[]>(RowFormModal, {
      data: { title, submitText, fields, values },
      width: '480px',
      ariaLabel: title,
    });
    return firstValueFrom(ref.afterClosed());
  }

  confirm(title: string, message: string, confirmText: string): Promise<boolean> {
    return this.modal.confirm({ title, message, confirmText, destructive: true });
  }

  async notice(title: string, message: string): Promise<void> {
    await this.modal.confirm({ title, message, confirmText: 'OK', hideCancel: true });
  }
}
