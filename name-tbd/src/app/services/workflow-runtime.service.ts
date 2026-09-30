import { Injectable, inject } from '@angular/core';
import { LayoutStateService } from './layout-state.service';
import { PageWorkflow, WorkflowStateService, outputPortId } from './workflow-state.service';
import { ActionNode, FlowNode, SetTextConfig, TriggerNode } from '../workflow-editor/workflow.types';

/**
 * Runs page workflows in the browser while the canvas is in preview mode.
 * Everything it changes is temporary: widgets get preview props, never saved ones.
 */
@Injectable({ providedIn: 'root' })
export class WorkflowRuntimeService {
  private workflowState = inject(WorkflowStateService);
  private layoutState = inject(LayoutStateService);

  // Pending "reset after N s" timers and the widgets currently showing preview props, per page
  private resetTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private previewed = new Map<string, Set<string>>();

  /** Run every flow that starts with a trigger for this element and event. */
  handleEvent(pageId: string, elementId: string, eventName = 'element_click'): void {
    this.workflowState.ensureGraph(pageId).subscribe((graph) => {
      graph.nodes
        .filter((n): n is TriggerNode =>
          n.type === 'Trigger' && n.elementId === elementId && n.eventName === eventName)
        .forEach((trigger) => this.runFrom(pageId, graph, trigger));
    });
  }

  /** Undo all temporary changes on the page (called when leaving preview). */
  reset(pageId: string): void {
    for (const [key, timer] of this.resetTimers) {
      if (key.startsWith(`${pageId}:`)) {
        clearTimeout(timer);
        this.resetTimers.delete(key);
      }
    }
    for (const id of this.previewed.get(pageId) ?? []) {
      this.layoutState.previewItemProps(pageId, id, null);
    }
    this.previewed.delete(pageId);
  }

  /** Walk the graph from the trigger along its connections, executing each action once. */
  private runFrom(pageId: string, graph: PageWorkflow, trigger: TriggerNode): void {
    const visited = new Set<string>();
    const queue = this.next(graph, trigger, 'out');

    while (queue.length > 0) {
      const node = queue.shift()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);

      if (node.type === 'Action') {
        this.execute(pageId, node);
        queue.push(...this.next(graph, node, 'out'));
      } else {
        console.warn(`[workflow] ${node.type} nodes are not supported in preview yet; stopping this branch.`);
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

  private execute(pageId: string, node: ActionNode): void {
    if (node.actionType !== 'set_text') {
      console.warn(`[workflow] Unknown action "${node.actionType}"`);
      return;
    }

    const config = node.config as SetTextConfig;
    if (!config.targetId) return;

    const key = `${pageId}:${config.targetId}`;
    clearTimeout(this.resetTimers.get(key));
    this.resetTimers.delete(key);

    this.layoutState.previewItemProps(pageId, config.targetId, { text: config.text ?? '' });
    if (!this.previewed.has(pageId)) this.previewed.set(pageId, new Set());
    this.previewed.get(pageId)!.add(config.targetId);

    if (config.resetEnabled) {
      const seconds = Math.max(0, Number(config.resetAfterSeconds) || 0);
      this.resetTimers.set(key, setTimeout(() => {
        this.resetTimers.delete(key);
        this.previewed.get(pageId)?.delete(config.targetId);
        // Back to the label's own text prop
        this.layoutState.previewItemProps(pageId, config.targetId, null);
      }, seconds * 1000));
    }
  }
}
