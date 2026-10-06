import { Type } from '@angular/core';
import { ActionHandler } from '../../_types/workflow.types';
import { SetTextHandler } from './actions/set-text/set-text.handler';
import { TableActionHandler } from './actions/table/table-action.handler';
import { ShowDetailHandler } from './actions/show-detail/show-detail.handler';
import { SearchHandler } from './actions/search/search.handler';
import { CloseModalHandler, OpenModalHandler } from './actions/modal/modal.handlers';
import { SubmitFormHandler } from './actions/form/submit-form.handler';
import { ValidateFormHandler } from './actions/form/validate-form.handler';
import { NavigateHandler } from './actions/navigate/navigate.handler';
import { ShowMessageHandler } from './actions/message/show-message.handler';

/**
 * What each workflow action that needs the page does, by action id: the editor's preview and the
 * exported app run these same handlers. The actions that only need data, variables and the network
 * (set_variable, loop, http_request, create/update/delete_row) are the flow engine's own
 * (src/flow-engine, BUILTIN_ACTIONS), so the server runs them too. (The editor adds each action's
 * label and settings, see ACTION_TYPES.)
 */
export const ACTION_HANDLERS: Record<string, Type<ActionHandler>> = {
  set_text: SetTextHandler,
  table: TableActionHandler,
  show_detail: ShowDetailHandler,
  search: SearchHandler,
  open_modal: OpenModalHandler,
  close_modal: CloseModalHandler,
  submit_form: SubmitFormHandler,
  validate_form: ValidateFormHandler,
  navigate: NavigateHandler,
  show_message: ShowMessageHandler,
};
