import { Type } from '@angular/core';
import { LucideIcon } from '@lucide/angular';
import { Point } from './viewport.types';

// The graph types are the flow engine's (src/flow-engine), with actions' configs typed as the app's.
export type {
  FlowNodeType, TriggerType, TriggerNode, ConditionNode, FlowConnection, LegacyCondition,
} from '../../flow-engine/graph';
import type {
  ActionNode as EngineActionNode, ConditionNode, FlowConnection, FlowRun, ActionExecutor, TriggerNode,
} from '../../flow-engine';
import type {
  CreateRowConfig, DeleteRowConfig, HttpRequestConfig, LoopConfig, SetVariableConfig, UpdateRowConfig,
} from '../../flow-engine/actions/configs';
export type {
  CreateRowConfig, DeleteRowConfig, HttpHeader, HttpRequestConfig, LoopConfig, RowValue, SetVariableConfig, UpdateRowConfig,
} from '../../flow-engine/actions/configs';

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

/** Config of `open_modal` and `close_modal`: the modal dialog on this page. */
export interface ModalConfig {
  modalId: string;
}

/** Config of `submit_form`: the form on this page to check and save. */
export interface SubmitFormConfig {
  formId: string;
}

/** Config of `validate_form`: the form whose fields are checked (the flow goes on through `valid` or `invalid`). */
export interface ValidateFormConfig {
  formId: string;
}

/** A value handed to the page a flow opens (`params.<name>` there). */
export interface PageParam {
  name: string;
  /** Template. */
  value: string;
}

/** Config of `navigate`: opens a page, with parameters. */
export interface NavigateConfig {
  pageId: string;
  params: PageParam[];
}

export type MessageTone = 'info' | 'success' | 'warning' | 'error';

/** Config of `show_message`: a short message over the app (a toast). */
export interface ShowMessageConfig {
  /** Template. */
  message: string;
  tone: MessageTone;
}

/**
 * Config of any action. A config field holding the id of a widget or page must be listed in
 * shared/id-references.json, so copies (paste, duplicate, restore) point to their own (id-references.spec checks).
 */
export type ActionConfig =
  | SetTextConfig | TableActionConfig | ShowDetailConfig | SearchConfig | ModalConfig | SubmitFormConfig | ValidateFormConfig
  | NavigateConfig | ShowMessageConfig | SetVariableConfig | LoopConfig | HttpRequestConfig | CreateRowConfig | UpdateRowConfig
  | DeleteRowConfig;

export type ActionNode = EngineActionNode<ActionConfig>;

export type FlowNode = TriggerNode | ConditionNode | ActionNode;
export type NewFlowNode = Omit<TriggerNode, 'id'> | Omit<ConditionNode, 'id'> | Omit<ActionNode, 'id'>;

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

export type { ActionOutcome, ActionResult } from '../../flow-engine';

/** One run of an action node (the engine's FlowRun, with the node typed as the app's). */
export type ActionRun = FlowRun & { readonly node: ActionNode };

/** Runs one action type while the app runs. Implementations are injectable services. */
export interface ActionHandler extends ActionExecutor {
  /** Undo what the action changed on the page (called when the preview stops). */
  reset?(pageId: string): void;
}

/** An output of an action node the flow can go on through (most have just `out`). */
export interface ActionPort {
  id: string;
  label: string;
}

/** An action as the editor offers it (what it does is its handler, see ACTION_HANDLERS). */
export interface ActionType {
  id: string;
  label: string;
  defaultConfig: ActionConfig;
  /** A component extending BaseActionEditor for this action's config (typed loosely: inputs are invariant). */
  editor: Type<unknown>;
  /** Its outputs, top to bottom (default: just `out`). */
  ports?: ActionPort[];
  /** The heading it's listed under in the action picker. */
  group: string;
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
