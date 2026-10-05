import {
  ActionNode, ConditionNode, FlowNode, FlowNodeType, OUT_PORT, TriggerNode, WorkflowGraph, conditionExpression, hasNext, nextNodes,
} from './graph';
import { Expressions, expressions as sharedExpressions } from './expressions/expressions';
import { displayText, fromCel } from './expressions/values';
import { BUILTIN_ACTIONS } from './actions/builtin-actions';

// The flow engine: runs a page's workflows from a trigger, node by node. It has no framework in
// it; the app around it (the editor's preview, the exported app, the server's sidecar) is its
// host: it gives the engine the scope expressions see, the variables, the data, and the actions
// that need the page (dialogs, forms, …). The engine itself runs conditions, loops and the pure
// actions (BUILTIN_ACTIONS: set a variable, change rows, HTTP requests).

/** Whether the flow goes on after an action (a cancelled dialog stops it). */
export type ActionOutcome = 'continue' | 'stop';

/** What an action did: whether and through which port the flow goes on, and what it produced (for the run log). */
export interface ActionResult {
  outcome?: ActionOutcome;
  /** The port the flow goes on through (default `out`). */
  port?: string;
  output?: unknown;
  /** Values the nodes after it can use (e.g. `response` after an HTTP request). */
  locals?: Record<string, unknown>;
}

/** One run of an action node. */
export interface FlowRun {
  readonly runId: number;
  readonly pageId: string;
  readonly node: ActionNode;
  /** The app the flow runs in (its variables, data, fetch). */
  readonly host: FlowHost;
  /** Values of this run (the trigger's event, a loop's item, …), on top of the page's scope. */
  readonly locals: Readonly<Record<string, unknown>>;
  /** False once the run was cancelled (e.g. the preview stopped): the action must not change anything any more. */
  isCurrent(): boolean;
  /** What expressions see at this point of the run. */
  scope(): object;
  evaluate(expression: string): unknown;
  /** A template's value (see Expressions.template). */
  template(text: string): unknown;
  /** A template as text. */
  text(text: string): string;
  /** Records the action's resolved settings, shown in the run log. */
  inputs(values: Record<string, unknown>): void;
}

/** What one action type does. */
export interface ActionExecutor {
  run(run: FlowRun): Promise<ActionOutcome | ActionResult | void>;
}

/** The app's variables (an app's and each page's), by name as a page sees them. */
export interface FlowVariables {
  get(pageId: string, name: string): unknown;
  /** Sets a variable seen on the page; throws for an unknown name or a value its type can't take. */
  set(pageId: string, name: string, value: unknown): void;
}

/** A data source's rows as actions change them. */
export interface FlowTable {
  columns: string[];
  rows: { id: string; values: (string | null)[] }[];
}

export interface FlowData {
  table(dataSourceId: number): Promise<FlowTable>;
  addRow(dataSourceId: number, values: string[]): unknown;
  updateRow(dataSourceId: number, rowId: string, values: string[]): unknown;
  deleteRows(dataSourceId: number, rowIds: string[]): unknown;
}

/** The minimal fetch the HTTP action needs (the browser's, or Node's). */
export type FlowFetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal }) =>
  Promise<{ status: number; ok: boolean; headers: { get(name: string): string | null }; text(): Promise<string> }>;

/** What the engine needs from the app it runs in. */
export interface FlowHost {
  /** The names expressions on the page can use (widgets, variables, page parameters, …). Read lazily. */
  scope(pageId: string): object;
  variables?: FlowVariables;
  data?: FlowData;
  fetch?: FlowFetch;
  /** The host's own action types (e.g. dialogs, forms); built-in ones are used for the rest. */
  action?(actionType: string): ActionExecutor | undefined;
}

export type RunLogStatus = 'ok' | 'stopped' | 'error' | 'skipped';

/** One step of a run, for the run log: a node, what it got, what it gave, and the branch taken. */
export interface RunLogEntry {
  runId: number;
  pageId: string;
  /** Order within the run. */
  step: number;
  nodeId: string;
  nodeType: FlowNodeType;
  /** e.g. `On click`, `Condition`, `set_variable`. */
  label: string;
  status: RunLogStatus;
  /** The port the flow went on through (a condition's `true` / `false`, a loop's `each` / `out`). */
  port?: string;
  inputs?: Record<string, unknown>;
  output?: unknown;
  error?: string;
  /** The loop item this step ran for (0-based), when it's inside a loop. */
  iteration?: number;
  at: number;
  durationMs: number;
}

export interface FlowRunResult {
  runId: number;
  entries: RunLogEntry[];
}

export interface RunOptions {
  pageId: string;
  /** Values the flow starts with, e.g. `event` with the trigger's details. */
  locals?: Record<string, unknown>;
  /** False once the run should stop changing things (e.g. the preview stopped). */
  isCurrent?: () => boolean;
}

export interface FlowEngineOptions {
  /** Told about every step as it finishes (e.g. the preview's run log). */
  onLog?: (entry: RunLogEntry) => void;
  expressions?: Expressions;
  /** Most items a loop runs for, so a mistake can't hang the app. */
  maxLoopItems?: number;
}

/** The action type the engine runs itself: repeats its `each` branch for every item of a list. */
export const LOOP_ACTION = 'loop';
export const LOOP_EACH_PORT = 'each';
/** The port an action's flow goes on through when it fails (if anything is connected to it). */
export const ERROR_PORT = 'error';

const DEFAULT_MAX_LOOP_ITEMS = 1000;

interface RunState {
  runId: number;
  pageId: string;
  graph: WorkflowGraph;
  isCurrent: () => boolean;
  entries: RunLogEntry[];
  step: number;
}

export class FlowEngine {
  private nextRunId = 1;
  private readonly expressions: Expressions;

  constructor(private readonly host: FlowHost, private readonly options: FlowEngineOptions = {}) {
    this.expressions = options.expressions ?? sharedExpressions;
  }

  /** Runs every flow whose trigger matches, side by side; resolves when all have finished. */
  async start(graph: WorkflowGraph, matches: (trigger: TriggerNode) => boolean, options: RunOptions): Promise<FlowRunResult[]> {
    const triggers = graph.nodes.filter((n): n is TriggerNode => n.type === 'Trigger' && matches(n));
    return Promise.all(triggers.map((trigger) => this.run(graph, trigger, options)));
  }

  /** Runs the flow that starts at this trigger; resolves when every branch of it has finished. */
  async run(graph: WorkflowGraph, trigger: TriggerNode, options: RunOptions): Promise<FlowRunResult> {
    const state: RunState = {
      runId: this.nextRunId++,
      pageId: options.pageId,
      graph,
      isCurrent: options.isCurrent ?? (() => true),
      entries: [],
      step: 0,
    };
    const locals = { ...options.locals };
    this.log(state, trigger, { status: 'ok', port: OUT_PORT, inputs: plainLocals(locals), at: Date.now(), durationMs: 0 });
    await this.follow(state, trigger, OUT_PORT, locals, new Set([trigger.id]));
    return { runId: state.runId, entries: state.entries };
  }

  /** Everything connected to the node's port: branches side by side, each node once per run (or loop item). */
  private async follow(state: RunState, node: FlowNode, port: string, locals: Record<string, unknown>, visited: Set<string>): Promise<void> {
    const children = nextNodes(state.graph, node.id, port).filter((child) => {
      if (visited.has(child.id)) return false;
      visited.add(child.id);
      return true;
    });
    await Promise.all(children.map((child) => this.visit(state, child, locals, visited)));
  }

  private async visit(state: RunState, node: FlowNode, locals: Record<string, unknown>, visited: Set<string>): Promise<void> {
    if (!state.isCurrent()) return;
    switch (node.type) {
      case 'Condition':
        return this.condition(state, node, locals, visited);
      case 'Action':
        return node.actionType === LOOP_ACTION
          ? this.loop(state, node, locals, visited)
          : this.action(state, node, locals, visited);
      default:
        // A trigger inside a flow only starts flows of its own
        return;
    }
  }

  private async condition(state: RunState, node: ConditionNode, locals: Record<string, unknown>, visited: Set<string>): Promise<void> {
    const at = Date.now();
    const expression = conditionExpression(node);
    let result: unknown;
    try {
      if (!expression) throw new Error('The condition has no expression');
      result = this.expressions.evaluate(expression, this.scope(state.pageId, locals));
      if (typeof result !== 'boolean') throw new Error(`The condition must be true or false, but is ${displayText(result) || 'empty'}`);
    } catch (err) {
      this.log(state, node, { status: 'error', inputs: { expression }, error: message(err), at, durationMs: Date.now() - at }, locals);
      return;
    }
    const port = result ? 'true' : 'false';
    this.log(state, node, { status: 'ok', port, inputs: { expression }, output: result, at, durationMs: Date.now() - at }, locals);
    await this.follow(state, node, port, locals, visited);
  }

  private async action(state: RunState, node: ActionNode, locals: Record<string, unknown>, visited: Set<string>): Promise<void> {
    const at = Date.now();
    const executor = this.host.action?.(node.actionType) ?? BUILTIN_ACTIONS[node.actionType];
    if (!executor) {
      this.log(state, node, { status: 'error', error: `Unknown action "${node.actionType}"`, at, durationMs: 0 }, locals);
      return;
    }
    let inputs: Record<string, unknown> | undefined;
    let result: ActionResult;
    try {
      const outcome = await executor.run(this.flowRun(state, node, locals, (values) => (inputs = { ...inputs, ...values })));
      result = typeof outcome === 'string' ? { outcome } : outcome ?? {};
    } catch (err) {
      const error = message(err);
      const recover = hasNext(state.graph, node.id, ERROR_PORT);
      this.log(state, node, { status: 'error', port: recover ? ERROR_PORT : undefined, inputs, error, at, durationMs: Date.now() - at }, locals);
      if (recover && state.isCurrent()) await this.follow(state, node, ERROR_PORT, { ...locals, error }, visited);
      return;
    }
    const goesOn = (result.outcome ?? 'continue') === 'continue' && state.isCurrent();
    const port = result.port ?? OUT_PORT;
    this.log(state, node, {
      status: goesOn ? 'ok' : 'stopped', port: goesOn ? port : undefined, inputs, output: result.output, at, durationMs: Date.now() - at,
    }, locals);
    if (goesOn) await this.follow(state, node, port, result.locals ? { ...locals, ...result.locals } : locals, visited);
  }

  /** `loop`: the `each` branch once per item (`item` and `index`, or the config's `as` name), one after another; then `out`. */
  private async loop(state: RunState, node: ActionNode, locals: Record<string, unknown>, visited: Set<string>): Promise<void> {
    const at = Date.now();
    const config = node.config as { items?: string; as?: string };
    const name = config.as?.trim() || 'item';
    let items: unknown[];
    try {
      const value = this.expressions.evaluate(config.items ?? '', this.scope(state.pageId, locals));
      if (!Array.isArray(value)) throw new Error(`Loop over a list, not ${displayText(value) || 'nothing'}`);
      items = value;
    } catch (err) {
      this.log(state, node, { status: 'error', inputs: { items: config.items }, error: message(err), at, durationMs: Date.now() - at }, locals);
      return;
    }
    const max = this.options.maxLoopItems ?? DEFAULT_MAX_LOOP_ITEMS;
    if (items.length > max) {
      this.log(state, node, { status: 'error', inputs: { items: items.length }, error: `A loop runs for at most ${max} items`, at, durationMs: 0 }, locals);
      return;
    }
    this.log(state, node, { status: 'ok', port: LOOP_EACH_PORT, inputs: { items: items.length }, at, durationMs: 0 }, locals);
    for (let i = 0; i < items.length; i++) {
      if (!state.isCurrent()) return;
      // Each item runs the branch afresh; nodes after the loop are left for `out`
      await this.follow(state, node, LOOP_EACH_PORT, { ...locals, [name]: items[i], index: BigInt(i), [ITERATION]: i }, new Set(visited));
    }
    if (!state.isCurrent()) return;
    this.log(state, node, { status: 'ok', port: OUT_PORT, output: items.length, at: Date.now(), durationMs: Date.now() - at }, locals);
    await this.follow(state, node, OUT_PORT, locals, visited);
  }

  private flowRun(state: RunState, node: ActionNode, locals: Record<string, unknown>, inputs: (values: Record<string, unknown>) => void): FlowRun {
    const scope = () => this.scope(state.pageId, locals);
    return {
      runId: state.runId,
      pageId: state.pageId,
      node,
      host: this.host,
      locals,
      isCurrent: state.isCurrent,
      scope,
      evaluate: (expression) => this.expressions.evaluate(expression, scope()),
      template: (text) => this.expressions.template(text, scope()),
      text: (text) => this.expressions.text(text, scope()),
      inputs,
    };
  }

  /** The page's scope with the run's values on top (the page's names are read lazily, through the prototype). */
  private scope(pageId: string, locals: Record<string, unknown>): object {
    const scope = Object.create(this.host.scope(pageId)) as Record<string, unknown>;
    for (const [key, value] of Object.entries(locals)) {
      if (key !== ITERATION) scope[key] = value === undefined ? null : value;
    }
    return scope;
  }

  private log(state: RunState, node: FlowNode, entry: Omit<RunLogEntry, 'runId' | 'pageId' | 'step' | 'nodeId' | 'nodeType' | 'label'>,
              locals?: Record<string, unknown>): void {
    const iteration = locals?.[ITERATION];
    const full: RunLogEntry = {
      runId: state.runId,
      pageId: state.pageId,
      step: state.step++,
      nodeId: node.id,
      nodeType: node.type,
      label: nodeLabel(node),
      ...(typeof iteration === 'number' ? { iteration } : {}),
      ...entry,
    };
    if (full.output !== undefined) full.output = fromCel(full.output);
    state.entries.push(full);
    this.options.onLog?.(full);
  }
}

/** The run's own bookkeeping in locals: which loop item a step belongs to. */
const ITERATION = '__iteration';

function nodeLabel(node: FlowNode): string {
  switch (node.type) {
    case 'Trigger': return node.triggerType;
    case 'Condition': return 'Condition';
    case 'Action': return node.actionType;
  }
}

function plainLocals(locals: Record<string, unknown>): Record<string, unknown> | undefined {
  const entries = Object.entries(locals).filter(([key]) => key !== ITERATION);
  return entries.length ? Object.fromEntries(entries.map(([k, v]) => [k, fromCel(v)])) : undefined;
}

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));
