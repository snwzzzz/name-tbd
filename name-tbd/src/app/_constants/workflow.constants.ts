import { LucideMousePointerClick, LucideSheet } from '@lucide/angular';
import { ActionType, ConditionOperator, WidgetTrigger } from '../_types/workflow.types';
import { CLICK_EVENT, ROW_DOUBLE_CLICK_EVENT } from './widget-events.constants';
import { Rect } from '../_types/viewport.types';
import { SetTextEditor } from '../workflow-actions/set-text/set-text-editor';
import { SetTextHandler } from '../workflow-actions/set-text/set-text.handler';
import { TableActionEditor } from '../workflow-actions/table/table-action-editor';
import { TableActionHandler } from '../workflow-actions/table/table-action.handler';
import { ShowDetailEditor } from '../workflow-actions/show-detail/show-detail-editor';
import { ShowDetailHandler } from '../workflow-actions/show-detail/show-detail.handler';

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
 * The actions workflow nodes can perform: each brings its settings editor and its handler, which
 * the preview runtime (workflow-runtime.service.ts) runs. A new action is added by adding an entry.
 */
export const ACTION_TYPES: ActionType[] = [
  {
    id: 'set_text',
    label: 'Change text',
    defaultConfig: { targetId: '', text: '', resetEnabled: false, resetAfterSeconds: 5 },
    editor: SetTextEditor,
    handler: SetTextHandler,
  },
  {
    id: 'table',
    label: 'Table action',
    defaultConfig: { tableId: '', operation: 'add_row' },
    editor: TableActionEditor,
    handler: TableActionHandler,
  },
  {
    id: 'show_detail',
    label: 'Show row in detail',
    defaultConfig: { tableId: '', detailId: '', detailPageId: '' },
    editor: ShowDetailEditor,
    handler: ShowDetailHandler,
  },
];

export { CLICK_EVENT, ROW_DOUBLE_CLICK_EVENT } from './widget-events.constants';

/**
 * The widget events that can start a flow: they're offered in the trigger node and in the
 * canvas's "Add action" menu. A new one is added by adding an entry (and firing it from its widget).
 */
export const WIDGET_TRIGGERS: WidgetTrigger[] = [
  {
    widgetType: 'button',
    event: CLICK_EVENT,
    title: 'On click',
    icon: LucideMousePointerClick,
    nameProp: 'label',
    describe: (name) => `button ${name} is clicked`,
  },
  {
    widgetType: 'table',
    event: ROW_DOUBLE_CLICK_EVENT,
    title: 'On row double-click',
    icon: LucideSheet,
    nameProp: 'title',
    describe: (name) => `a row in table ${name} is double-clicked`,
  },
];

/** The trigger a widget type offers, if any. */
export const widgetTrigger = (widgetType: string | undefined): WidgetTrigger | undefined =>
  WIDGET_TRIGGERS.find((trigger) => trigger.widgetType === widgetType);

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
