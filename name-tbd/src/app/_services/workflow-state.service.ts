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
import { outputPortId } from '../_utils/port.utils';

const EMPTY_GRAPH: WorkflowGraph = { nodes: [], connections: [] };
/** Node edits are saved after this pause, so typing doesn't flood the API. */
const SAVE_DEBOUNCE_MS = 300;

/** The workflow of each page (by page id = editor tab id). Every change is persisted. */
@Injectable({ providedIn: 'root' })
export class WorkflowStateService {
  private readonly workflowService = inject(WorkflowControllerService);
  private readonly pageService = inject(PageControllerService);

  private readonly graphs = signal<Record<string, PageWorkflow>>({});
  private readonly pendingLoads = new Map<string, Observable<PageWorkflow>>();
  private readonly pendingTriggers = new Map<string, Observable<string>>();
  private readonly saveTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

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

  getGraphForTab(pageId: string): WorkflowGraph {
    return this.graphs()[pageId] ?? EMPTY_GRAPH;
  }

  /** Create a node in the backend and add it to the graph with its real id. */
  addNode(pageId: string, node: NewFlowNode): Observable<FlowNode> {
    return this.ensureGraph(pageId).pipe(
      switchMap((graph) =>
        this.workflowService.createNode(graph.workflowId, {
          workflowId: graph.workflowId,
          type: node.type,
          props: toApiProps(toNodeProps(node)),
          x: node.position.x,
          y: node.position.y,
        }),
      ),
      map((dto) => ({ ...node, id: dto.id!.toString() }) as FlowNode),
      tap((created) => this.patchGraph(pageId, (g) => ({ ...g, nodes: [...g.nodes, created] }))),
    );
  }

  /** Replace a node locally right away and persist it (debounced). */
  updateNode(pageId: string, node: FlowNode): void {
    this.patchGraph(pageId, (g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === node.id ? node : n)) }));

    const workflowId = this.graphs()[pageId]?.workflowId;
    if (workflowId == null) return;

    clearTimeout(this.saveTimeouts.get(node.id));
    this.saveTimeouts.set(node.id, setTimeout(() => {
      this.saveTimeouts.delete(node.id);
      this.workflowService.updateNode(workflowId, Number(node.id), {
        props: toApiProps(toNodeProps(node)),
        x: node.position.x,
        y: node.position.y,
      }).subscribe({ error: (err) => console.error(`Failed to save workflow node ${node.id}`, err) });
    }, SAVE_DEBOUNCE_MS));
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

  disconnect(pageId: string, connectionId: string): void {
    const workflowId = this.graphs()[pageId]?.workflowId;
    this.patchGraph(pageId, (g) => ({ ...g, connections: g.connections.filter((c) => c.id !== connectionId) }));
    if (workflowId != null) {
      this.workflowService.deleteEdge(workflowId, Number(connectionId))
        .subscribe({ error: (err) => console.error(`Failed to delete workflow connection ${connectionId}`, err) });
    }
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

  private patchGraph(pageId: string, update: (graph: PageWorkflow) => WorkflowGraph): void {
    this.graphs.update((all) => {
      const graph = all[pageId];
      return graph ? { ...all, [pageId]: { ...graph, ...update(graph) } } : all;
    });
  }
}
