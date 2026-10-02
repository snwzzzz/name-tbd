import { Type } from '@angular/core';
import { LucideIcon } from '@lucide/angular';
import { Point } from './viewport.types';

export type FlowNodeType = 'Trigger' | 'Condition' | 'Action';
export type TriggerType = 'element_click' | 'page_load' | 'timer';

export interface FlowNodeBase {
  id: string;
  position: Point;
  type: FlowNodeType;
}

export interface TriggerNode extends FlowNodeBase {
  type: 'Trigger';
  triggerType: TriggerType;
  elementId?: string;
  eventName?: string;
}

export interface Condition {
  field: string;
  operator: string;
  value: string;
}

export interface ConditionNode extends FlowNodeBase {
  type: 'Condition';
  condition: Condition;
}

/** Config of a `set_text` action: temporarily replaces a label's text. */
export interface SetTextConfig {
  targetId: string;          // id of the label on the page
  text: string;
  resetEnabled: boolean;     // restore the label's own text afterwards
  resetAfterSeconds: number;
}

/** Config of the table action: the data table it acts on, and what it does (see TABLE_OPERATIONS). */
export interface TableActionConfig {
  tableId: string;           // id of the data table on the page
  operation: string;         // e.g. 'add_row'
}

/** Config of `show_detail`: shows the row selected in a table in a detail section (on any page). */
export interface ShowDetailConfig {
  tableId: string;           // id of the data table on this page
  detailId: string;          // id of the detail section
  detailPageId: string;      // the page the detail section is on (opened if it isn't this one)
}

/** Config of `search`: filters a table (or every table on the page) by what's typed into an input. */
export interface SearchConfig {
  inputId: string;           // id of the input whose text is searched for
  tableId: string;           // id of a data table on this page, or 'all' (see SEARCH_ALL_TABLES)
}

/** Config of any action. */
export type ActionConfig = SetTextConfig | TableActionConfig | ShowDetailConfig | SearchConfig;

export interface ActionNode extends FlowNodeBase {
  type: 'Action';
  actionType: string;
  config: ActionConfig;
}

export type FlowNode = TriggerNode | ConditionNode | ActionNode;
export type NewFlowNode = Omit<TriggerNode, 'id'> | Omit<ConditionNode, 'id'> | Omit<ActionNode, 'id'>;

export interface FlowConnection {
  id: string;
  fromNode: string;
  toNode: string;
  fromPort: string;
  toPort: string;
}

export interface WorkflowGraph {
  nodes: FlowNode[];
  connections: FlowConnection[];
}

/** The workflow that belongs to a page, with its graph. */
export interface PageWorkflow extends WorkflowGraph {
  workflowId: number;
}

/** Everything a node stores besides its id, type and position. */
export type NodeProps = Record<string, unknown>;

export interface ConditionOperator {
  id: string;
  label: string;
  requiresValue: boolean;
}

/** Whether the flow goes on after an action (a cancelled modal stops it). */
export type ActionOutcome = 'continue' | 'stop';

/** One run of an action node while a page is previewed. */
export interface ActionRun {
  pageId: string;
  node: ActionNode;
  /** False once the preview was stopped: the action must not change anything any more. */
  isCurrent(): boolean;
}

/** Runs one action type in the preview. Implementations are injectable services. */
export interface ActionHandler {
  run(run: ActionRun): Promise<ActionOutcome>;
  /** Undo what the action changed on the page (called when the preview stops). */
  reset?(pageId: string): void;
}

/** An action as the editor offers it (what it does is its handler, see ACTION_HANDLERS). */
export interface ActionType {
  id: string;
  label: string;
  defaultConfig: ActionConfig;
  /** A component extending BaseActionEditor for this action's config (typed loosely: inputs are invariant). */
  editor: Type<unknown>;
}

/** An event a widget type fires on the page that can start a flow (see WIDGET_TRIGGERS). */
export interface WidgetTrigger {
  widgetType: string;
  event: string;
  /** The trigger node's title, e.g. "On click". */
  title: string;
  icon: LucideIcon;
  /** The prop that names the widget in the trigger picker (e.g. a button's label). */
  nameProp: string;
  /** e.g. `button “Save” (#4) is clicked`, for the trigger picker. */
  describe(name: string): string;
}

/** The right-click menu of the workflow editor. */
export type WorkflowContextMenu =
  | { kind: 'node'; x: number; y: number; node: FlowNode }
  | { kind: 'connection'; x: number; y: number; connectionId: string };
