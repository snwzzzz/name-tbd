import { ActionType, ConditionOperator } from '../_types/workflow.types';
import { Rect } from '../_types/viewport.types';
import { SetTextEditor } from '../editor/action-editors/set-text-editor';
import { TableActionEditor } from '../editor/action-editors/table-action-editor';
import { ShowDetailEditor } from '../editor/action-editors/show-detail-editor';
import { SearchEditor } from '../editor/action-editors/search-editor';
import { ModalActionEditor, SubmitFormEditor } from '../editor/action-editors/widget-picker-editor';
import { SEARCH_ALL_TABLES } from '../core/workflow/actions/search/search.handler';

export const CONDITION_OPERATORS: ConditionOperator[] = [
  { id: 'equals', label: 'Equals', requiresValue: true },
  { id: 'notEquals', label: 'Not Equals', requiresValue: true },
  { id: 'greaterThan', label: 'Greater Than', requiresValue: true },
  { id: 'lessThan', label: 'Less Than', requiresValue: true },
  { id: 'contains', label: 'Contains', requiresValue: true },
  { id: 'isTrue', label: 'Is True', requiresValue: false },
  { id: 'isFalse', label: 'Is False', requiresValue: false },
];

/**
 * The actions workflow nodes can perform, as the editor offers them: label, default settings and
 * settings editor. What each one does is its handler in the runtime core (ACTION_HANDLERS, by the
 * same id). A new action: an entry here and its handler there.
 */
export const ACTION_TYPES: ActionType[] = [
  {
    id: 'set_text',
    label: 'Change text',
    defaultConfig: { targetId: '', text: '', resetEnabled: false, resetAfterSeconds: 5 },
    editor: SetTextEditor,
  },
  {
    id: 'table',
    label: 'Table action',
    defaultConfig: { tableId: '', operation: 'add_row' },
    editor: TableActionEditor,
  },
  {
    id: 'show_detail',
    label: 'Show row in detail',
    defaultConfig: { tableId: '', detailId: '', detailPageId: '' },
    editor: ShowDetailEditor,
  },
  {
    id: 'search',
    label: 'Search table',
    defaultConfig: { inputId: '', tableId: SEARCH_ALL_TABLES },
    editor: SearchEditor,
  },
  {
    id: 'open_modal',
    label: 'Open dialog',
    defaultConfig: { modalId: '' },
    editor: ModalActionEditor,
  },
  {
    id: 'close_modal',
    label: 'Close dialog',
    defaultConfig: { modalId: '' },
    editor: ModalActionEditor,
  },
  {
    id: 'submit_form',
    label: 'Submit form',
    defaultConfig: { formId: '' },
    editor: SubmitFormEditor,
  },
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
