import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_DATA, APP_LAYOUT } from '../../../ports/app-ports';
import { TableSelectionService } from '../../../services/table-selection.service';
import { ModalService } from '../../../../_services/modal/modal.service';
import { RowFormField, RowFormModal, RowFormModalData } from '../../../../components/row-form-modal/row-form-modal';
import { ActionRun, TableActionConfig } from '../../../../_types/workflow.types';
import { TableData, TableRow } from '../../../../_types/data-source.types';
import { findInTree } from '../../../../_utils/layout-tree.utils';
import { propBool, propNumber, propText } from '../../../../_utils/widget-props.utils';
import { describeColumns } from '../../../../_utils/data-source.utils';
import { isRowWidget } from '../../../rendering/row-widgets';

/** The data table an action works on, with its data. */
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
  private readonly layout = inject(APP_LAYOUT);
  private readonly appData = inject(APP_DATA);
  private readonly selection = inject(TableSelectionService);
  private readonly modal = inject(ModalService);

  /** The action's table and its data; null (after telling the user why) when there's none to act on. */
  async target({ pageId, node }: ActionRun): Promise<TableTarget | null> {
    const { tableId } = node.config as TableActionConfig;
    const item = tableId ? findInTree(this.layout.items(pageId), tableId) : null;
    if (!item || !isRowWidget(item.type)) {
      await this.notice('No table', 'This action has no table. Pick one in the workflow editor.');
      return null;
    }

    const name = propText(item.props, 'title') ?? `Table #${item.id}`;
    const dataSourceId = propNumber(item.props, 'dataSourceId', NaN);
    if (!Number.isInteger(dataSourceId)) {
      await this.notice('No data', `“${name}” has no data source yet.`);
      return null;
    }
    let data: TableData;
    try {
      data = await this.appData.loadTable(dataSourceId);
    } catch {
      await this.notice('No data', `The data of “${name}” couldn't be loaded.`);
      return null;
    }

    return {
      tableId: String(item.id),
      name,
      dataSourceId,
      data,
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

  /** Runs a change; when it fails (e.g. the server refused it), tells the user why. Resolves to whether it worked. */
  async save(change: () => Promise<void>): Promise<boolean> {
    try {
      await change();
      return true;
    } catch (err) {
      await this.notice('Not saved', err instanceof Error ? err.message : String(err));
      return false;
    }
  }

  async notice(title: string, message: string): Promise<void> {
    await this.modal.confirm({ title, message, confirmText: 'OK', hideCancel: true });
  }
}
