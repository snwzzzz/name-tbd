import { ActionType } from '../_types/workflow.types';
import { Rect } from '../_types/viewport.types';
import { SetTextEditor } from '../editor/action-editors/set-text-editor';
import { TableActionEditor } from '../editor/action-editors/table-action-editor';
import { ShowDetailEditor } from '../editor/action-editors/show-detail-editor';
import { SearchEditor } from '../editor/action-editors/search-editor';
import { ModalActionEditor, SubmitFormEditor } from '../editor/action-editors/widget-picker-editor';
import {
  HttpRequestEditor, LoopEditor, NavigateEditor, RowActionEditor, SetVariableEditor, ShowMessageEditor,
} from '../editor/action-editors/logic-editors';
import { SEARCH_ALL_TABLES } from '../core/workflow/actions/search/search.handler';
import { INVALID_PORT, VALID_PORT } from '../core/workflow/actions/form/validate-form.handler';
import { ERROR_PORT, LOOP_EACH_PORT, OUT_PORT } from '../../flow-engine';

/** The groups of the action picker, in order. */
export const ACTION_GROUPS = ['Page', 'Forms', 'Data', 'Logic', 'Connections'];

/**
 * The actions workflow nodes can perform, as the editor offers them: label, default settings,
 * settings editor and outputs. What each one does is its handler in the runtime core
 * (ACTION_HANDLERS, by the same id) or the flow engine's own (BUILTIN_ACTIONS, and the loop).
 * A new action: an entry here and its handler there.
 */
export const ACTION_TYPES: ActionType[] = [
  // ─── Page ──────────────────────────────────────────────────────────────────
  { id: 'show_message', label: 'Show message', group: 'Page',
    defaultConfig: { message: '', tone: 'success' }, editor: ShowMessageEditor },
  { id: 'navigate', label: 'Open page', group: 'Page',
    defaultConfig: { pageId: '', params: [] }, editor: NavigateEditor },
  { id: 'open_modal', label: 'Open dialog', group: 'Page', defaultConfig: { modalId: '' }, editor: ModalActionEditor },
  { id: 'close_modal', label: 'Close dialog', group: 'Page', defaultConfig: { modalId: '' }, editor: ModalActionEditor },
  { id: 'set_text', label: 'Change text', group: 'Page',
    defaultConfig: { targetId: '', text: '', resetEnabled: false, resetAfterSeconds: 5 }, editor: SetTextEditor },
  { id: 'show_detail', label: 'Show row in detail', group: 'Page',
    defaultConfig: { tableId: '', detailId: '', detailPageId: '' }, editor: ShowDetailEditor },
  // ─── Forms ─────────────────────────────────────────────────────────────────
  { id: 'validate_form', label: 'Check form', group: 'Forms', defaultConfig: { formId: '' }, editor: SubmitFormEditor,
    ports: [{ id: VALID_PORT, label: 'Valid' }, { id: INVALID_PORT, label: 'Invalid' }] },
  { id: 'submit_form', label: 'Submit form', group: 'Forms', defaultConfig: { formId: '' }, editor: SubmitFormEditor },
  // ─── Data ──────────────────────────────────────────────────────────────────
  { id: 'create_row', label: 'Add row', group: 'Data', defaultConfig: { dataSourceId: '', values: [] }, editor: RowActionEditor },
  { id: 'update_row', label: 'Update row', group: 'Data',
    defaultConfig: { dataSourceId: '', row: '', values: [] }, editor: RowActionEditor },
  { id: 'delete_row', label: 'Delete row', group: 'Data', defaultConfig: { dataSourceId: '', row: '' }, editor: RowActionEditor },
  { id: 'table', label: 'Table action (ask in a form)', group: 'Data',
    defaultConfig: { tableId: '', operation: 'add_row' }, editor: TableActionEditor },
  { id: 'search', label: 'Search table', group: 'Data',
    defaultConfig: { inputId: '', tableId: SEARCH_ALL_TABLES }, editor: SearchEditor },
  // ─── Logic ─────────────────────────────────────────────────────────────────
  { id: 'set_variable', label: 'Set variable', group: 'Logic', defaultConfig: { variable: '', value: '' }, editor: SetVariableEditor },
  { id: 'loop', label: 'Loop over list', group: 'Logic', defaultConfig: { items: '', as: 'item' }, editor: LoopEditor,
    ports: [{ id: LOOP_EACH_PORT, label: 'For each' }, { id: OUT_PORT, label: 'Done' }] },
  // ─── Connections ───────────────────────────────────────────────────────────
  { id: 'http_request', label: 'HTTP request', group: 'Connections',
    defaultConfig: { method: 'GET', url: '', headers: [], body: '', resultVariable: '' }, editor: HttpRequestEditor,
    ports: [{ id: OUT_PORT, label: 'Done' }, { id: ERROR_PORT, label: 'Failed' }] },
];

/** An action type's outputs (most have just `out`). */
export const actionPorts = (actionType: string) =>
  ACTION_TYPES.find((a) => a.id === actionType)?.ports ?? [{ id: OUT_PORT, label: '' }];

/** Values a flow has of its own, besides the page's names (offered in its expressions). */
export const FLOW_LOCALS = [
  { name: 'event', kind: 'local' as const, type: 'trigger', detail: 'What started the flow: event.value, event.widget' },
  { name: 'row', kind: 'local' as const, type: 'row', detail: 'The row a table or list trigger fired for' },
  { name: 'item', kind: 'local' as const, type: 'loop item', detail: 'Inside a loop: the current item' },
  { name: 'index', kind: 'local' as const, type: 'number', detail: 'Inside a loop: the item’s position, from 0' },
  { name: 'response', kind: 'local' as const, type: 'HTTP answer', detail: 'After an HTTP request: response.status, response.data' },
  { name: 'error', kind: 'local' as const, type: 'text', detail: 'After “Failed”: why the action failed' },
];

export { CLICK_EVENT, INPUT_EVENT, ROW_DOUBLE_CLICK_EVENT } from './widget-events.constants';

// Widget triggers live in the runtime core; re-exported for the editor
export { WIDGET_TRIGGERS, widgetTrigger } from '../core/workflow/widget-triggers';

// ─── Workflow editor viewport ─────────────────────────────────────────────────
/** The area nodes live in (world coordinates). Nodes can't be dropped outside it. */
export const WORKFLOW_WORLD: Rect = { x: -2000, y: -1500, w: 5000, h: 3500 };
/** Rough node size, used to keep a dropped node fully inside the border. */
export const WORKFLOW_NODE_WIDTH = 240;
export const WORKFLOW_NODE_HEIGHT = 160;
/** How much of the border area (in screen px) always stays in view while panning. */
export const WORKFLOW_KEEP_VISIBLE = 120;
/** Space kept around the nodes when fitting them into view. */
export const WORKFLOW_FIT_PADDING = 56;
/** Same limits as the page canvas. */
export const WORKFLOW_MIN_ZOOM = 0.05;
export const WORKFLOW_MAX_ZOOM = 4;

// ─── Automatic node placement ────────────────────────────────────────────────
/** Where a new action goes relative to the node it's connected to. */
export const NEXT_NODE_OFFSET_X = 300;
export const NEXT_NODE_OFFSET_Y = 250;
/** Where the first click trigger goes, and how far apart the next ones are. */
export const TRIGGER_START = { x: 100, y: 100 };
export const TRIGGER_SPACING_Y = 220;
