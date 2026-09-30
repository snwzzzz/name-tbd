import { Type } from '@angular/core';
import { ActionHandler } from '../../_types/workflow.types';
import { AddRowHandler } from './add-row.handler';
import { EditRowHandler } from './edit-row.handler';
import { DeleteRowsHandler } from './delete-rows.handler';

/** Something the table action can do with its table. */
export interface TableOperation {
  id: string;
  label: string;
  handler: Type<ActionHandler>;
}

/** The table action's operations, in the order its node lists them. A new one is added by adding an entry. */
export const TABLE_OPERATIONS: TableOperation[] = [
  { id: 'add_row', label: 'Add row', handler: AddRowHandler },
  { id: 'edit_row', label: 'Edit selected row', handler: EditRowHandler },
  { id: 'delete_rows', label: 'Delete selected rows', handler: DeleteRowsHandler },
];
