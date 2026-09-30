import { Type } from '@angular/core';
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

/** Config of any action. */
export type ActionConfig = SetTextConfig | TableActionConfig;

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

/** An action nodes can perform: its settings editor and what it does when run. */
export interface ActionType {
  id: string;
  label: string;
  defaultConfig: ActionConfig;
  /** A component extending BaseActionEditor for this action's config (typed loosely: inputs are invariant). */
  editor: Type<unknown>;
  handler: Type<ActionHandler>;
}

/** The right-click menu of the workflow editor. */
export type WorkflowContextMenu =
  | { kind: 'node'; x: number; y: number; node: FlowNode }
  | { kind: 'connection'; x: number; y: number; connectionId: string };
