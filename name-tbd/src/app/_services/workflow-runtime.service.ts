import { Injectable, inject } from '@angular/core';
import { LayoutStateService } from './layout-state.service';
import { WorkflowStateService } from './workflow-state.service';
import { ActionNode, FlowNode, PageWorkflow, TriggerNode } from '../_types/workflow.types';
import { CLICK_EVENT } from '../_constants/workflow.constants';
import { outputPortId } from '../_utils/port.utils';

/**
 * Runs page workflows in the browser while the canvas is in preview mode.
 * Everything it changes is temporary: widgets get preview props, never saved ones.
 */
@Injectable({ providedIn: 'root' })
export class WorkflowRuntimeService {
  private readonly workflowState = inject(WorkflowStateService);
  private readonly layoutState = inject(LayoutStateService);

  // Widgets currently showing preview props, per page
  private readonly previewed = new Map<string, Set<string>>();
  // Changes to one widget take turns: each waits until the one before it has finished (`${pageId}:${widgetId}`)
  private readonly widgetQueues = new Map<string, Promise<void>>();
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
    for (const key of [...this.widgetQueues.keys()]) {
      if (key.startsWith(`${pageId}:`)) this.widgetQueues.delete(key);
    }
    for (const id of this.previewed.get(pageId) ?? []) {
      this.layoutState.previewItemProps(pageId, id, null);
    }
    this.previewed.delete(pageId);
  }

  /**
   * Start everything connected to the node's output. Branches run side by side, but
   * actions on the same widget run one after another, top to bottom as laid out.
   * A connected action starts once the one before it has finished (its reset included).
   */
  private runNext(pageId: string, graph: PageWorkflow, node: FlowNode, visited: Set<string>, gen: number): void {
    const next = this.next(graph, node, 'out').sort((a, b) => a.position.y - b.position.y);
    for (const child of next) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);

      if (child.type === 'Action') {
        this.execute(pageId, child, gen).then(() => {
          if (this.generation(pageId) === gen) this.runNext(pageId, graph, child, visited, gen);
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

  /** Queue the action on its widget; resolves once it has finished (after its reset, if any). */
  private execute(pageId: string, node: ActionNode, gen: number): Promise<void> {
    if (node.actionType !== 'set_text') {
      console.warn(`[workflow] Unknown action "${node.actionType}"`);
      return Promise.resolve();
    }

    const config = node.config;
    if (!config.targetId) return Promise.resolve();

    const key = `${pageId}:${config.targetId}`;
    const run = (this.widgetQueues.get(key) ?? Promise.resolve()).then(async () => {
      if (this.generation(pageId) !== gen) return;

      this.layoutState.previewItemProps(pageId, config.targetId, { text: config.text ?? '' });
      if (!this.previewed.has(pageId)) this.previewed.set(pageId, new Set());
      this.previewed.get(pageId)!.add(config.targetId);

      if (!config.resetEnabled) return;
      const seconds = Math.max(0, Number(config.resetAfterSeconds) || 0);
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      if (this.generation(pageId) !== gen) return;

      this.previewed.get(pageId)?.delete(config.targetId);
      // Back to the label's own text prop
      this.layoutState.previewItemProps(pageId, config.targetId, null);
    });

    this.widgetQueues.set(key, run);
    // Forget the queue once it has drained, so it doesn't grow forever
    run.then(() => { if (this.widgetQueues.get(key) === run) this.widgetQueues.delete(key); });
    return run;
  }

  private generation(pageId: string): number {
    return this.generations.get(pageId) ?? 0;
  }
}
