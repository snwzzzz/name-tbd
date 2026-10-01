import { Injectable, Injector, inject } from '@angular/core';
import { ActionNode, ActionOutcome, FlowNode, TriggerNode, WorkflowGraph } from '../../_types/workflow.types';
import { CLICK_EVENT } from '../../_constants/widget-events.constants';
import { outputPortId } from '../../_utils/port.utils';
import { WORKFLOW_SOURCE } from '../ports/app-ports';
import { ACTION_HANDLERS } from './action-handlers';

/**
 * Runs page workflows: in the editor's preview and in the exported app alike. Graphs come from
 * the WorkflowSource port, and what each action does is its handler (ACTION_HANDLERS).
 */
@Injectable({ providedIn: 'root' })
export class WorkflowRuntimeService {
  private readonly source = inject(WORKFLOW_SOURCE);
  private readonly injector = inject(Injector);

  // Bumped by reset(), so waiting steps of an old session never apply
  private readonly generations = new Map<string, number>();

  /** Run every flow that starts with a trigger for this element and event. */
  async handleEvent(pageId: string, elementId: string, eventName = CLICK_EVENT): Promise<void> {
    await this.start(pageId, (t) => t.elementId === elementId && t.eventName === eventName);
  }

  /** Run every flow that starts when the page loads (triggers not tied to a widget). */
  async handlePageLoad(pageId: string): Promise<void> {
    await this.start(pageId, (t) => !t.elementId && (t.triggerType ?? 'page_load') === 'page_load');
  }

  /** Undo all temporary changes on the page (e.g. when the preview stops). */
  reset(pageId: string): void {
    this.generations.set(pageId, this.generation(pageId) + 1);
    for (const handler of Object.values(ACTION_HANDLERS)) this.injector.get(handler).reset?.(pageId);
  }

  private async start(pageId: string, matches: (trigger: TriggerNode) => boolean): Promise<void> {
    const gen = this.generation(pageId);
    const graph = await this.source.graph(pageId);
    graph.nodes
      .filter((n): n is TriggerNode => n.type === 'Trigger' && matches(n))
      .forEach((trigger) => this.runNext(pageId, graph, trigger, new Set(), gen));
  }

  /**
   * Start everything connected to the node's output. Branches run side by side; a connected
   * action starts once the one before it has finished, and not at all if that one stopped the flow.
   */
  private runNext(pageId: string, graph: WorkflowGraph, node: FlowNode, visited: Set<string>, gen: number): void {
    const next = this.next(graph, node, 'out').sort((a, b) => a.position.y - b.position.y);
    for (const child of next) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);

      if (child.type === 'Action') {
        this.execute(pageId, child, gen).then((outcome) => {
          if (outcome === 'continue' && this.generation(pageId) === gen) this.runNext(pageId, graph, child, visited, gen);
        });
      } else {
        console.warn(`[workflow] ${child.type} nodes are not supported yet; stopping this branch.`);
      }
    }
  }

  private next(graph: WorkflowGraph, node: FlowNode, port: string): FlowNode[] {
    const fromPort = outputPortId(node.id, port);
    return graph.connections
      .filter((c) => c.fromPort === fromPort)
      .map((c) => graph.nodes.find((n) => n.id === c.toNode))
      .filter((n): n is FlowNode => !!n);
  }

  /** Run the action with its handler; a failing action stops its branch. */
  private async execute(pageId: string, node: ActionNode, gen: number): Promise<ActionOutcome> {
    const handler = ACTION_HANDLERS[node.actionType];
    if (!handler) {
      console.warn(`[workflow] Unknown action "${node.actionType}"`);
      return 'continue';
    }
    try {
      return await this.injector.get(handler).run({
        pageId,
        node,
        isCurrent: () => this.generation(pageId) === gen,
      });
    } catch (err) {
      console.error(`[workflow] Action "${node.actionType}" failed`, err);
      return 'stop';
    }
  }

  private generation(pageId: string): number {
    return this.generations.get(pageId) ?? 0;
  }
}
