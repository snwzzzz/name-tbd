import { Injectable, inject, signal } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { WorkflowControllerService } from '../api/services/workflowController.service';
import { PageControllerService } from '../api/services/pageController.service';
import {
  ActionNode, FlowConnection, FlowNode, NewFlowNode, PageWorkflow, TriggerNode, WorkflowGraph,
} from '../_types/workflow.types';
import {
  ACTION_TYPES, CLICK_EVENT, NEXT_NODE_OFFSET_X, NEXT_NODE_OFFSET_Y, TRIGGER_SPACING_Y, TRIGGER_START,
} from '../_constants/workflow.constants';
import { toApiProps, toConnection, toFlowNode, toNodeProps } from '../_utils/api-mapper.utils';
import { inputPortId, outputPortId } from '../_utils/port.utils';
import { ChangeOperation } from '../api/models';
import { WORKFLOW_NODE_ID_KINDS } from '../core/catalog/id-references';
import { SaveQueue } from './save-queue.service';
import { IdRegistry } from './id-registry.service';

const EMPTY_GRAPH: WorkflowGraph = { nodes: [], connections: [] };

/**
 * The workflow of each page (by page id = editor tab id). Changes apply here right away and go to
 * the backend through the SaveQueue; new nodes and connections have a temporary id until it's
 * swapped for the saved one (IdRegistry).
 */
@Injectable({ providedIn: 'root' })
export class WorkflowStateService {
  private readonly workflowService = inject(WorkflowControllerService);
  private readonly pageService = inject(PageControllerService);
  private readonly saveQueue = inject(SaveQueue);
  private readonly registry = inject(IdRegistry);

  private readonly graphs = signal<Record<string, PageWorkflow>>({});
  private readonly pendingLoads = new Map<string, Observable<PageWorkflow>>();
  private readonly pendingTriggers = new Map<string, Observable<string>>();

  constructor() {
    this.registry.mapped$.subscribe((ids) => this.adoptSavedIds(ids));
  }

  /** Load the page's workflow (nodes + edges) once; later calls get the cached graph. */
  ensureGraph(pageId: string): Observable<PageWorkflow> {
    const cached = this.graphs()[pageId];
    if (cached) return of(cached);

    let pending = this.pendingLoads.get(pageId);
    if (!pending) {
      pending = this.pageService.getPageWorkflow(Number(pageId)).pipe(
        switchMap((workflow) => {
          const workflowId = workflow.id!;
          return forkJoin({
            nodes: this.workflowService.getNodes(workflowId),
            edges: this.workflowService.getEdges(workflowId),
          }).pipe(
            map(({ nodes, edges }): PageWorkflow => ({
              workflowId,
              nodes: (nodes ?? []).map(toFlowNode),
              connections: (edges ?? []).map(toConnection),
            })),
          );
        }),
        tap((graph) => this.graphs.update((all) => ({ ...all, [pageId]: graph }))),
        finalize(() => this.pendingLoads.delete(pageId)),
        shareReplay(1),
      );
      this.pendingLoads.set(pageId, pending);
    }
    return pending;
  }

  /** The page's workflow as loaded with the page (GET /pages/:id/full); a graph already here wins. */
  seedGraph(pageId: string, graph: PageWorkflow): void {
    if (this.graphs()[pageId]) return;
    this.graphs.update((all) => ({ ...all, [pageId]: graph }));
  }

  getGraphForTab(pageId: string): WorkflowGraph {
    return this.graphs()[pageId] ?? EMPTY_GRAPH;
  }

  /** Add a node to the graph (with a temporary id) and save it. */
  addNode(pageId: string, node: NewFlowNode): Observable<FlowNode> {
    return this.ensureGraph(pageId).pipe(
      map((graph) => {
        const created = { ...node, id: this.registry.newRef() } as FlowNode;
        this.patchGraph(pageId, (g) => ({ ...g, nodes: [...g.nodes, created] }));
        this.saveQueue.enqueue({
          op: 'createNode',
          ref: created.id,
          workflowId: graph.workflowId,
          type: node.type,
          props: toApiProps(toNodeProps(node)),
          x: node.position.x,
          y: node.position.y,
        });
        return created;
      }),
    );
  }

  /** Replace a node: shown right away, saved with the next batch. */
  updateNode(pageId: string, node: FlowNode): void {
    this.patchGraph(pageId, (g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === node.id ? node : n)) }));
    this.saveQueue.enqueue({
      op: 'updateNode',
      ...target(node.id),
      props: toApiProps(toNodeProps(node)),
      x: node.position.x,
      y: node.position.y,
    });
  }

  /** Remove a node and its connections (the backend deletes the edges with it). */
  deleteNode(pageId: string, nodeId: string): void {
    this.patchGraph(pageId, (g) => ({
      nodes: g.nodes.filter((n) => n.id !== nodeId),
      connections: g.connections.filter((c) => c.fromNode !== nodeId && c.toNode !== nodeId),
    }));
    this.saveQueue.enqueue({ op: 'deleteNode', ...target(nodeId) });
  }

  /** Brings back deleted nodes with these connections between them, by their ids (undo/redo). */
  restoreNodes(pageId: string, nodes: FlowNode[], connections: FlowConnection[]): void {
    this.patchGraph(pageId, (g) => {
      const all = [...g.nodes, ...nodes.filter((n) => !g.nodes.some((existing) => existing.id === n.id))];
      const ids = new Set(all.map((n) => n.id));
      const restored = connections.filter((c) => ids.has(c.fromNode) && ids.has(c.toNode) && !g.connections.some((e) => e.id === c.id));
      return { nodes: all, connections: [...g.connections, ...restored] };
    });
    nodes.forEach((node) => this.saveQueue.enqueue({ op: 'restoreNode', ...target(node.id) }));
    // Connections deleted along with another of their nodes come back once both nodes are here
    connections.forEach((c) => this.saveQueue.enqueue({ op: 'restoreEdge', ...target(c.id) }));
  }

  /** Connect an output port of one node to the input of another. */
  connect(pageId: string, fromNode: string, fromPort: string, toNode: string): void {
    this.createConnection(pageId, fromNode, fromPort, toNode)
      .subscribe({ error: (err) => console.error('Failed to save workflow connection', err) });
  }

  disconnect(pageId: string, connectionId: string): void {
    this.patchGraph(pageId, (g) => ({ ...g, connections: g.connections.filter((c) => c.id !== connectionId) }));
    this.saveQueue.enqueue({ op: 'deleteEdge', ...target(connectionId) });
  }

  /**
   * Add a new action to an element's click flow: creates the click trigger if the
   * element has none yet, then a default action connected to it. Emits the action's id.
   */
  addActionForElement(pageId: string, elementId: string, eventType = CLICK_EVENT): Observable<string> {
    return this.addTriggerForElement(pageId, elementId, eventType).pipe(
      switchMap((triggerId) => this.addActionAfter(pageId, triggerId)),
    );
  }

  /** Add a default action connected to one of a node's output ports. Emits the action's id. */
  addActionAfter(pageId: string, fromNodeId: string, fromPort = 'out'): Observable<string> {
    const graph = this.getGraphForTab(pageId);
    const from = graph.nodes.find((n) => n.id === fromNodeId);
    if (!from) return of('');

    // Right of the node, below any actions already hanging off it
    const existing = graph.connections.filter((c) => c.fromNode === fromNodeId).length;
    const action = ACTION_TYPES[0];
    const node: Omit<ActionNode, 'id'> = {
      type: 'Action',
      actionType: action.id,
      config: { ...action.defaultConfig },
      position: { x: from.position.x + NEXT_NODE_OFFSET_X, y: from.position.y + existing * NEXT_NODE_OFFSET_Y },
    };
    return this.addNode(pageId, node).pipe(
      switchMap((created) =>
        this.createConnection(pageId, fromNodeId, fromPort, created.id).pipe(map(() => created.id)),
      ),
    );
  }

  /** Return the click trigger of an element, creating it if the element has none yet. */
  addTriggerForElement(pageId: string, elementId: string, eventType = CLICK_EVENT): Observable<string> {
    // Concurrent callers share one creation
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

  /** Connect an output port of one node to the input of another; emits the connection (null if there's one already). */
  addConnection(pageId: string, fromNode: string, fromPort: string, toNode: string): Observable<FlowConnection | null> {
    return this.createConnection(pageId, fromNode, fromPort, toNode);
  }

  private createConnection(pageId: string, fromNode: string, fromPort: string, toNode: string): Observable<FlowConnection | null> {
    const workflowId = this.graphs()[pageId]?.workflowId;
    if (workflowId == null || fromNode === toNode) return of(null);
    // A port may have many connections, but the same pair only once
    const fromPortId = outputPortId(fromNode, fromPort);
    if (this.getGraphForTab(pageId).connections.some((c) => c.fromPort === fromPortId && c.toNode === toNode)) return of(null);

    const connection: FlowConnection = {
      id: this.registry.newRef(),
      fromNode,
      toNode,
      fromPort: fromPortId,
      toPort: inputPortId(toNode),
    };
    this.patchGraph(pageId, (g) => ({ ...g, connections: [...g.connections, connection] }));
    const [source, targetNode] = [target(fromNode), target(toNode)];
    this.saveQueue.enqueue({
      op: 'createEdge',
      ref: connection.id,
      workflowId,
      sourceId: source.id,
      sourceRef: source.ref,
      targetId: targetNode.id,
      targetRef: targetNode.ref,
      sourcePort: fromPort,
    });
    return of(connection);
  }

  private findOrCreateTrigger(pageId: string, elementId: string, eventType: string): Observable<string> {
    return this.ensureGraph(pageId).pipe(
      switchMap((graph) => {
        const existing = graph.nodes.find((n) =>
          n.type === 'Trigger' && n.elementId === elementId && n.eventName === eventType);
        if (existing) return of(existing.id);

        // Stack triggers vertically so each button's flow starts on its own row
        const triggerCount = graph.nodes.filter((n) => n.type === 'Trigger').length;
        const trigger: Omit<TriggerNode, 'id'> = {
          type: 'Trigger',
          triggerType: 'element_click',
          elementId,
          eventName: eventType,
          position: { x: TRIGGER_START.x, y: TRIGGER_START.y + triggerCount * TRIGGER_SPACING_Y },
        };
        return this.addNode(pageId, trigger).pipe(map((node) => node.id));
      }),
    );
  }

  /**
   * Things were saved: nodes and connections go by their real ids from now on, and so do the
   * widgets nodes point at (an element's trigger, an action's target).
   */
  private adoptSavedIds(ids: ReadonlyMap<string, number>): void {
    const swap = (id: string): string => (ids.has(id) ? String(ids.get(id)) : id);
    const swapRefs = (values: Record<string, unknown>): Record<string, unknown> =>
      Object.fromEntries(Object.entries(values).map(([key, value]) =>
        [key, typeof value === 'string' && key in WORKFLOW_NODE_ID_KINDS ? swap(value) : value]));
    const renameNode = (node: FlowNode): FlowNode => {
      const renamed = { ...swapRefs(node as unknown as Record<string, unknown>), id: swap(node.id) } as unknown as FlowNode;
      const config = (node as { config?: Record<string, unknown> }).config;
      return config ? ({ ...renamed, config: swapRefs(config) } as unknown as FlowNode) : renamed;
    };
    const renameConnection = (c: FlowConnection): FlowConnection => {
      const port = c.fromPort.slice(c.fromNode.length + 1);
      const [fromNode, toNode] = [swap(c.fromNode), swap(c.toNode)];
      return { id: swap(c.id), fromNode, toNode, fromPort: outputPortId(fromNode, port), toPort: inputPortId(toNode) };
    };
    this.graphs.update((all) => Object.fromEntries(Object.entries(all).map(([page, graph]) =>
      [page, { ...graph, nodes: graph.nodes.map(renameNode), connections: graph.connections.map(renameConnection) }])));
  }

  private patchGraph(pageId: string, update: (graph: PageWorkflow) => WorkflowGraph): void {
    this.graphs.update((all) => {
      const graph = all[pageId];
      return graph ? { ...all, [pageId]: { ...graph, ...update(graph) } } : all;
    });
  }
}

/** How a change names a node or connection: by id once saved, else by its temporary id. */
function target(id: string): Pick<ChangeOperation, 'id' | 'ref'> {
  return /^-?\d+$/.test(id) ? { id: Number(id) } : { ref: id };
}
