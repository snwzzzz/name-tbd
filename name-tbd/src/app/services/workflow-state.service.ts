import { Injectable, signal, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { ActionNode, FlowNode, FlowConnection, TriggerNode } from '../workflow-editor/workflow.types';
import { ACTION_TYPES } from '../workflow-editor/workflow-operators';
import { WorkflowControllerService } from '../api/services/workflowController.service';
import { PageControllerService } from '../api/services/pageController.service';
import { EdgeDto, NodeDto } from '../api/models';

export interface WorkflowState {
  nodes: FlowNode[];
  connections: FlowConnection[];
}

/** The workflow that belongs to a page, with its graph. */
export interface PageWorkflow extends WorkflowState {
  workflowId: number;
}

const EMPTY_STATE: WorkflowState = { nodes: [], connections: [] };

/** Output port ids are `${nodeId}-${port}`, input port ids `${nodeId}-in`. */
export const outputPortId = (nodeId: string, port: string) => `${nodeId}-${port}`;
export const inputPortId = (nodeId: string) => `${nodeId}-in`;

@Injectable({
  providedIn: 'root'
})
export class WorkflowStateService {
  private workflowService = inject(WorkflowControllerService);
  private pageService = inject(PageControllerService);

  // Workflow graphs by page id (= editor tab id)
  private graphs = signal<Record<string, PageWorkflow>>({});
  private pendingLoads = new Map<string, Observable<PageWorkflow>>();
  private pendingTriggers = new Map<string, Observable<string>>();
  private saveTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  /** Load the page's workflow (nodes + edges) once; later calls get the cached graph. */
  ensureGraph(pageId: string): Observable<PageWorkflow> {
    const cached = this.graphs()[pageId];
    if (cached) return of(cached);

    let pending = this.pendingLoads.get(pageId);
    if (!pending) {
      pending = this.pageService.getPageWorkflow(Number(pageId)).pipe(
        switchMap((workflow) =>
          forkJoin({
            nodes: this.workflowService.getNodes(workflow.id!),
            edges: this.workflowService.getEdges(workflow.id!),
          }).pipe(
            map(({ nodes, edges }): PageWorkflow => ({
              workflowId: workflow.id!,
              nodes: (nodes ?? []).map(toFlowNode),
              connections: (edges ?? []).map(toConnection),
            })),
          ),
        ),
        tap((graph) => this.graphs.update((g) => ({ ...g, [pageId]: graph }))),
        finalize(() => this.pendingLoads.delete(pageId)),
        shareReplay(1),
      );
      this.pendingLoads.set(pageId, pending);
    }
    return pending;
  }

  getGraphForTab(pageId: string): WorkflowState {
    return this.graphs()[pageId] ?? EMPTY_STATE;
  }

  /** Create a node in the backend and add it to the graph with its real id. */
  addNode(pageId: string, node: Omit<FlowNode, 'id'>): Observable<FlowNode> {
    return this.ensureGraph(pageId).pipe(
      switchMap((graph) =>
        this.workflowService.createNode(graph.workflowId, {
          workflowId: graph.workflowId,
          type: node.type,
          props: nodeProps(node),
          x: node.position.x,
          y: node.position.y,
        } as any),
      ),
      map((dto) => ({ ...node, id: dto.id!.toString() }) as FlowNode),
      tap((created) => this.patchGraph(pageId, (g) => ({ ...g, nodes: [...g.nodes, created] }))),
    );
  }

  /** Replace a node locally right away and persist it (debounced, so typing doesn't flood the API). */
  updateNode(pageId: string, node: FlowNode): void {
    this.patchGraph(pageId, (g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === node.id ? node : n)) }));

    const workflowId = this.graphs()[pageId]?.workflowId;
    if (workflowId == null) return;

    clearTimeout(this.saveTimeouts.get(node.id));
    this.saveTimeouts.set(node.id, setTimeout(() => {
      this.saveTimeouts.delete(node.id);
      this.workflowService.updateNode(workflowId, Number(node.id), {
        props: nodeProps(node),
        x: node.position.x,
        y: node.position.y,
      } as any).subscribe({ error: (err) => console.error(`Failed to save workflow node ${node.id}`, err) });
    }, 300));
  }

  /** Remove a node and its connections (the backend drops the edges with it). */
  deleteNode(pageId: string, nodeId: string): void {
    const workflowId = this.graphs()[pageId]?.workflowId;
    clearTimeout(this.saveTimeouts.get(nodeId));
    this.patchGraph(pageId, (g) => ({
      nodes: g.nodes.filter((n) => n.id !== nodeId),
      connections: g.connections.filter((c) => c.fromNode !== nodeId && c.toNode !== nodeId),
    }));
    if (workflowId != null) {
      this.workflowService.deleteNode(workflowId, Number(nodeId))
        .subscribe({ error: (err) => console.error(`Failed to delete workflow node ${nodeId}`, err) });
    }
  }

  /** Connect an output port of one node to the input of another. */
  connect(pageId: string, fromNode: string, fromPort: string, toNode: string): void {
    this.createConnection(pageId, fromNode, fromPort, toNode)
      .subscribe({ error: (err) => console.error('Failed to save workflow connection', err) });
  }

  private createConnection(pageId: string, fromNode: string, fromPort: string, toNode: string): Observable<FlowConnection | null> {
    const workflowId = this.graphs()[pageId]?.workflowId;
    if (workflowId == null || fromNode === toNode) return of(null);
    // A port may have many connections, but the same pair only once
    const fromPortId = outputPortId(fromNode, fromPort);
    if (this.getGraphForTab(pageId).connections.some((c) => c.fromPort === fromPortId && c.toNode === toNode)) return of(null);

    return this.workflowService.createEdge(workflowId, {
      sourceNodeId: Number(fromNode),
      targetNodeId: Number(toNode),
      sourcePort: fromPort,
    }).pipe(
      map(toConnection),
      tap((conn) => this.patchGraph(pageId, (g) => ({ ...g, connections: [...g.connections, conn] }))),
    );
  }

  /**
   * Add a new action to an element's click flow: creates the click trigger if the
   * element has none yet, then a default action connected to it. Emits the action's id.
   */
  addActionForElement(pageId: string, elementId: string, eventType: string = 'element_click'): Observable<string> {
    return this.addTriggerForElement(pageId, elementId, eventType).pipe(
      switchMap((triggerId) => this.addActionAfter(pageId, triggerId)),
    );
  }

  /** Add a default action connected to one of a node's output ports. Emits the action's id. */
  addActionAfter(pageId: string, fromNodeId: string, fromPort: string = 'out'): Observable<string> {
    const graph = this.getGraphForTab(pageId);
    const from = graph.nodes.find((n) => n.id === fromNodeId);
    if (!from) return of('');
    // Place it right of the node, below any actions already hanging off it
    const existing = graph.connections.filter((c) => c.fromNode === fromNodeId).length;
    const action = ACTION_TYPES[0];
    const node: Omit<ActionNode, 'id'> = {
      type: 'Action',
      actionType: action.id,
      config: { ...action.defaultConfig },
      position: { x: from.position.x + 300, y: from.position.y + existing * 250 },
    };
    return this.addNode(pageId, node).pipe(
      switchMap((created) =>
        this.createConnection(pageId, fromNodeId, fromPort, created.id).pipe(map(() => created.id)),
      ),
    );
  }

  disconnect(pageId: string, connectionId: string): void {
    const workflowId = this.graphs()[pageId]?.workflowId;
    this.patchGraph(pageId, (g) => ({ ...g, connections: g.connections.filter((c) => c.id !== connectionId) }));
    if (workflowId != null) {
      this.workflowService.deleteEdge(workflowId, Number(connectionId))
        .subscribe({ error: (err) => console.error(`Failed to delete workflow connection ${connectionId}`, err) });
    }
  }

  /** Return the click trigger of an element, creating it if the element has none yet. */
  addTriggerForElement(pageId: string, elementId: string, eventType: string = 'element_click'): Observable<string> {
    // Concurrent callers (the context menu and the workflow section opening) share one creation
    const key = `${pageId}:${elementId}:${eventType}`;
    let pending = this.pendingTriggers.get(key);
    if (!pending) {
      pending = this.findOrCreateTrigger(pageId, elementId, eventType).pipe(
        finalize(() => this.pendingTriggers.delete(key)),
        shareReplay(1),
      );
      this.pendingTriggers.set(key, pending);
    }
    return pending;
  }

  private findOrCreateTrigger(pageId: string, elementId: string, eventType: string): Observable<string> {
    return this.ensureGraph(pageId).pipe(
      switchMap((graph) => {
        const existing = graph.nodes.find((n) =>
          n.type === 'Trigger' &&
          (n as TriggerNode).elementId === elementId &&
          (n as TriggerNode).eventName === eventType,
        );
        if (existing) return of(existing.id);

        // Stack triggers vertically so each button's flow starts on its own row
        const triggerCount = graph.nodes.filter((n) => n.type === 'Trigger').length;
        const trigger: Omit<TriggerNode, 'id'> = {
          type: 'Trigger',
          triggerType: 'element_click',
          elementId,
          eventName: eventType,
          position: { x: 100, y: 100 + triggerCount * 220 },
        };
        return this.addNode(pageId, trigger).pipe(map((node) => node.id));
      }),
    );
  }

  private patchGraph(pageId: string, fn: (graph: PageWorkflow) => WorkflowState): void {
    this.graphs.update((g) => {
      const graph = g[pageId];
      return graph ? { ...g, [pageId]: { ...graph, ...fn(graph) } } : g;
    });
  }
}

/** Everything except id/type/position is stored in the node's `props`. */
function nodeProps(node: Omit<FlowNode, 'id'>): Record<string, unknown> {
  const { type, position, ...props } = node as any;
  delete props.id;
  return props;
}

function toFlowNode(dto: NodeDto): FlowNode {
  return {
    ...(dto.props as any),
    id: dto.id!.toString(),
    type: dto.type === 'Trigger' || dto.type === 'Condition' ? dto.type : 'Action',
    position: { x: dto.x ?? 100, y: dto.y ?? 100 },
  } as FlowNode;
}

function toConnection(dto: EdgeDto): FlowConnection {
  const fromNode = dto.sourceNodeId!.toString();
  const toNode = dto.targetNodeId!.toString();
  return {
    id: dto.id!.toString(),
    fromNode,
    toNode,
    fromPort: outputPortId(fromNode, dto.sourcePort ?? 'out'),
    toPort: inputPortId(toNode),
  };
}
