import { Type } from '@angular/core';
import { ActionHandler } from '../../_types/workflow.types';
import { SetTextHandler } from './actions/set-text/set-text.handler';
import { TableActionHandler } from './actions/table/table-action.handler';
import { ShowDetailHandler } from './actions/show-detail/show-detail.handler';

/**
 * What each workflow action does, by action id: the editor's preview and the exported app run
 * these same handlers. (The editor adds each action's label and settings, see ACTION_TYPES.)
 */
export const ACTION_HANDLERS: Record<string, Type<ActionHandler>> = {
  set_text: SetTextHandler,
  table: TableActionHandler,
  show_detail: ShowDetailHandler,
};
