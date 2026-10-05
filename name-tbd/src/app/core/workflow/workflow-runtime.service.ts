import { DestroyRef, Injectable, InjectionToken, Injector, inject } from '@angular/core';
import { CLICK_EVENT } from '../../_constants/widget-events.constants';
import { APP_DATA, APP_LAYOUT, APP_PAGES, APP_SESSION, WORKFLOW_SOURCE } from '../ports/app-ports';
import { ExpressionScopeService, widgetName } from '../expressions/expression-scope.service';
import { VariableChange, VariablesService } from '../variables/variables.service';
import { ACTION_HANDLERS } from './action-handlers';
import { RunLogService } from './run-log.service';
import { findInTree } from '../../_utils/layout-tree.utils';
import { LayoutItem } from '../../_types/layout.types';
import { FlowData, FlowEngine, FlowFetch, FlowHost, TriggerNode, WorkflowGraph, toCel } from '../../../flow-engine';

/** How flows call URLs (the HTTP request action): the browser's fetch; specs provide their own. */
export const FLOW_FETCH = new InjectionToken<FlowFetch | undefined>('FLOW_FETCH', {
  providedIn: 'root',
  factory: () => (typeof fetch === 'function' ? (fetch.bind(globalThis) as unknown as FlowFetch) : undefined),
});

/** Variable changes starting flows faster than this many within a second are a loop: they stop starting flows. */
const MAX_VARIABLE_TRIGGERS_PER_SECOND = 20;
/** The shortest interval of a timer trigger. */
const MIN_TIMER_SECONDS = 1;

/**
 * Runs page workflows, in the editor's preview and in the exported app alike, on the flow engine
 * (src/flow-engine). This is the engine's browser host: expressions see the page's scope
 * (ExpressionScopeService), variables are VariablesService's, data goes through the APP_DATA port,
 * and the actions that need the page are handlers (ACTION_HANDLERS). Every step goes to the run log.
 */
@Injectable({ providedIn: 'root' })
export class WorkflowRuntimeService {
  private readonly source = inject(WORKFLOW_SOURCE);
  private readonly injector = inject(Injector);
  private readonly layout = inject(APP_LAYOUT);
  private readonly pages = inject(APP_PAGES);
  private readonly session = inject(APP_SESSION);
  private readonly scopes = inject(ExpressionScopeService);
  private readonly variables = inject(VariablesService);
  private readonly runLog = inject(RunLogService);

  private readonly engine = new FlowEngine(this.host(), { onLog: (entry) => this.runLog.add(entry) });

  // Bumped by reset(), so waiting steps of an old session never apply
  private readonly generations = new Map<string, number>();
  // The timers of the page open now, by page id
  private readonly timers = new Map<string, ReturnType<typeof setInterval>[]>();
  private recentVariableTriggers: number[] = [];

  constructor() {
    const changes = this.variables.changes$.subscribe((change) => this.onVariableChange(change));
    inject(DestroyRef).onDestroy(() => {
      changes.unsubscribe();
      [...this.timers.keys()].forEach((pageId) => this.stopTimers(pageId));
    });
  }

  /** Run every flow that starts with a trigger for this element and event. */
  async handleEvent(pageId: string, elementId: string, eventName = CLICK_EVENT): Promise<void> {
    const locals = this.eventLocals(pageId, elementId, eventName);
    await this.start(pageId, (t) => t.elementId === elementId && t.eventName === eventName, locals);
  }

  /**
   * The page was opened: its own variables start afresh, its timers start (the other pages' stop),
   * and every flow that starts when the page loads runs.
   */
  async handlePageLoad(pageId: string): Promise<void> {
    this.variables.resetPage(pageId);
    [...this.timers.keys()].filter((id) => id !== pageId).forEach((id) => this.stopTimers(id));
    void this.startTimers(pageId);
    await this.start(pageId, (t) => !t.elementId && (t.triggerType ?? 'page_load') === 'page_load');
  }

  /** Undo all temporary changes on the page (e.g. when the preview stops), and stop its timers. */
  reset(pageId: string): void {
    this.generations.set(pageId, this.generation(pageId) + 1);
    this.stopTimers(pageId);
    for (const handler of Object.values(ACTION_HANDLERS)) this.injector.get(handler).reset?.(pageId);
  }

  private async start(pageId: string, matches: (trigger: TriggerNode) => boolean, locals?: Record<string, unknown>): Promise<void> {
    const gen = this.generation(pageId);
    const graph = await this.source.graph(pageId);
    await this.engine.start(graph, matches, { pageId, locals, isCurrent: () => this.generation(pageId) === gen });
  }

  // ─── Triggers ──────────────────────────────────────────────────────────────

  private async startTimers(pageId: string): Promise<void> {
    const gen = this.generation(pageId);
    const graph = await this.source.graph(pageId);
    if (this.generation(pageId) !== gen) return;
    this.stopTimers(pageId);
    const handles = graph.nodes
      .filter((n): n is TriggerNode => n.type === 'Trigger' && n.triggerType === 'timer')
      .map((trigger) => setInterval(
        () => this.runTimer(pageId, graph, trigger, gen),
        Math.max(MIN_TIMER_SECONDS, Number(trigger.intervalSeconds) || 0) * 1000,
      ));
    this.timers.set(pageId, handles);
  }

  private runTimer(pageId: string, graph: WorkflowGraph, trigger: TriggerNode, gen: number): void {
    if (this.generation(pageId) !== gen || !this.session.live()) return;
    void this.engine.run(graph, trigger, { pageId, isCurrent: () => this.generation(pageId) === gen });
  }

  private stopTimers(pageId: string): void {
    this.timers.get(pageId)?.forEach((handle) => clearInterval(handle));
    this.timers.delete(pageId);
  }

  /** A variable took a new value: the flows of the open page waiting for it run. */
  private onVariableChange(change: VariableChange): void {
    const pageId = this.session.pageId() ?? change.pageId;
    const now = Date.now();
    this.recentVariableTriggers = [...this.recentVariableTriggers.filter((t) => now - t < 1000), now];
    if (this.recentVariableTriggers.length > MAX_VARIABLE_TRIGGERS_PER_SECOND) {
      console.warn(`[workflow] "${change.name}" keeps changing: flows that set the variable they start from loop. Not starting more.`);
      return;
    }
    void this.start(pageId, (t) => t.triggerType === 'variable_change' && t.variable === change.name,
      { event: { variable: change.name, value: change.value } });
  }

  /** What a widget's flows get as `event` (the widget and its value) and `row` (a table's or list's selected row). */
  private eventLocals(pageId: string, elementId: string, eventName: string): Record<string, unknown> {
    const item = this.findWidget(pageId, elementId);
    if (!item) return { event: { type: eventName } };
    const name = widgetName(item);
    let value: unknown = null;
    try {
      value = (this.scopes.scope(pageId) as Record<string, unknown>)[name];
    } catch {
      // A widget whose value can't be read starts its flows all the same
    }
    const fields = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const locals: Record<string, unknown> = { event: { type: eventName, widget: name, value: fields['value'] ?? null } };
    if ('selectedRow' in fields) locals['row'] = fields['selectedRow'];
    return toCel(locals) as Record<string, unknown>;
  }

  /** A widget of the page, or of the layout page around it. */
  private findWidget(pageId: string, elementId: string): LayoutItem | null {
    const own = findInTree(this.layout.items(pageId), elementId);
    if (own) return own;
    const layoutPage = this.pages.pages().find((p) => p.layout);
    return layoutPage ? findInTree(this.layout.items(String(layoutPage.id)), elementId) : null;
  }

  private host(): FlowHost {
    const appData = inject(APP_DATA);
    const data: FlowData = {
      table: (id) => appData.loadTable(id),
      addRow: (id, values) => appData.addRow(id, values),
      updateRow: (id, rowId, values) => appData.updateRow(id, rowId, values),
      deleteRows: (id, rowIds) => appData.deleteRows(id, rowIds),
    };
    return {
      scope: (pageId) => this.scopes.scope(pageId),
      variables: this.variables,
      data,
      fetch: inject(FLOW_FETCH) ?? undefined,
      action: (actionType) => {
        const handler = ACTION_HANDLERS[actionType];
        return handler ? this.injector.get(handler) : undefined;
      },
    };
  }

  private generation(pageId: string): number {
    return this.generations.get(pageId) ?? 0;
  }
}
