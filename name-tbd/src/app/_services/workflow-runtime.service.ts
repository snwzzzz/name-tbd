import { Injectable, Injector, inject } from '@angular/core';
import { WorkflowStateService } from './workflow-state.service';
import { ActionNode, ActionOutcome, FlowNode, PageWorkflow, TriggerNode } from '../_types/workflow.types';
import { ACTION_TYPES, CLICK_EVENT } from '../_constants/workflow.constants';
import { outputPortId } from '../_utils/port.utils';

/**
 * Runs page workflows in the browser while the canvas is in preview mode. What each action does
 * is up to its handler (see ACTION_TYPES); none of it is saved.
 */
@Injectable({ providedIn: 'root' })
export class WorkflowRuntimeService {
  private readonly workflowState = inject(WorkflowStateService);
  private readonly injector = inject(Injector);

  // Bumped by reset(), so waiting steps of an old preview session never apply
  private readonly generations = new Map<string, number>();

  /** Run every flow that starts with a trigger for this element and event. */
  handleEvent(pageId: string, elementId: string, eventName = CLICK_EVENT): void {
    this.workflowState.ensureGraph(pageId).subscribe((graph) => {
      graph.nodes
        .filter((n): n is TriggerNode => n.type === 'Trigger' && n.elementId === elementId && n.eventName === eventName)
        .forEach((trigger) => this.runNext(pageId, graph, trigger, new Set(), this.generation(pageId)));
    });
  }

  /** Undo all temporary changes on the page (called when leaving preview). */
  reset(pageId: string): void {
    this.generations.set(pageId, this.generation(pageId) + 1);
    for (const type of ACTION_TYPES) this.injector.get(type.handler).reset?.(pageId);
  }

  /**
   * Start everything connected to the node's output. Branches run side by side; a connected
   * action starts once the one before it has finished, and not at all if that one stopped the flow.
   */
  private runNext(pageId: string, graph: PageWorkflow, node: FlowNode, visited: Set<string>, gen: number): void {
    const next = this.next(graph, node, 'out').sort((a, b) => a.position.y - b.position.y);
    for (const child of next) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);

      if (child.type === 'Action') {
        this.execute(pageId, child, gen).then((outcome) => {
          if (outcome === 'continue' && this.generation(pageId) === gen) this.runNext(pageId, graph, child, visited, gen);
        });
      } else {
        console.warn(`[workflow] ${child.type} nodes are not supported in preview yet; stopping this branch.`);
      }
    }
  }

  private next(graph: PageWorkflow, node: FlowNode, port: string): FlowNode[] {
    const fromPort = outputPortId(node.id, port);
    return graph.connections
      .filter((c) => c.fromPort === fromPort)
      .map((c) => graph.nodes.find((n) => n.id === c.toNode))
      .filter((n): n is FlowNode => !!n);
  }

  /** Run the action with its type's handler; a failing action stops its branch. */
  private async execute(pageId: string, node: ActionNode, gen: number): Promise<ActionOutcome> {
    const type = ACTION_TYPES.find((t) => t.id === node.actionType);
    if (!type) {
      console.warn(`[workflow] Unknown action "${node.actionType}"`);
      return 'continue';
    }
    try {
      return await this.injector.get(type.handler).run({
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
