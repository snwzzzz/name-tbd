import { Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, map } from 'rxjs';
import {
  FCanvasChangeEvent, FCreateConnectionEvent, FDeleteSelectedEvent, FFlowModule, FReassignConnectionEvent,
} from '@foblex/flow';
import {
  LucideCircleCheck, LucideCircleX, LucidePlus, LucideTrash2, LucideUnlink,
} from '@lucide/angular';
import { WorkflowStateService } from '../../_services/workflow-state.service';
import { LayoutStateService } from '../../_services/layout-state.service';
import { PagesStateService } from '../../_services/pages-state.service';
import { ContextMenu } from '../../components/context-menu/context-menu';
import { ContextMenuItem } from '../../components/context-menu/context-menu-item';
import { ContextMenuDivider } from '../../components/context-menu/context-menu-divider';
import { ZoomControls } from '../../components/zoom-controls/zoom-controls';
import { ViewportCommand, ViewportControls, ZoomAtEvent } from '../../_directives/viewport-controls.directive';
import { WorkflowNode } from './workflow-node/workflow-node';
import { FlowNode, NewFlowNode, WorkflowContextMenu } from '../../_types/workflow.types';
import { Point, Rect } from '../../_types/viewport.types';
import {
  ACTION_TYPES, FLOW_LOCALS, WORKFLOW_FIT_PADDING, actionPorts, WORKFLOW_KEEP_VISIBLE, WORKFLOW_MAX_ZOOM, WORKFLOW_MIN_ZOOM,
  WORKFLOW_NODE_HEIGHT, WORKFLOW_NODE_WIDTH, WORKFLOW_WORLD,
} from '../../_constants/workflow.constants';
import { splitPortId } from '../../_utils/port.utils';
import { ExpressionScopeService } from '../../core/expressions/expression-scope.service';
import { VariablesService } from '../../core/variables/variables.service';
import { ScopeEntry } from '../../../flow-engine';
import { flattenTree } from '../../_utils/layout-tree.utils';
import { HistoryService } from '../../editor/commands/history.service';
import { recordGraphChange } from '../../editor/commands/workflow-commands';
import {
  blueprintGridStyle, boundingBox, clamp, clampPanToBounds, fitToViewport, zoomAround,
} from '../../_utils/viewport.utils';

const BUTTON_ZOOM_STEP = 1.25;

/** Edits the workflow of the page open in the current tab. */
@Component({
  selector: 'app-workflow-editor',
  imports: [FFlowModule, WorkflowNode, ViewportControls, ZoomControls, ContextMenu, ContextMenuItem, ContextMenuDivider],
  templateUrl: './workflow-editor.html',
  styleUrl: './workflow-editor.scss',
})
export class WorkflowEditor {
  private readonly workflowState = inject(WorkflowStateService);
  private readonly history = inject(HistoryService);
  private readonly layoutState = inject(LayoutStateService);
  private readonly pages = inject(PagesStateService);
  private readonly scopes = inject(ExpressionScopeService);
  private readonly variablesService = inject(VariablesService);
  private readonly flowEl = viewChild.required<string, ElementRef<HTMLElement>>('flowEl', { read: ElementRef });
  private readonly controls = viewChild.required(ViewportControls);

  readonly tabId = toSignal(inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('tabId') ?? '')), {
    initialValue: '',
  });

  // ─── Graph (owned by WorkflowStateService, which persists every change) ──
  readonly nodes = computed(() => this.workflowState.getGraphForTab(this.tabId()).nodes);
  readonly connections = computed(() => this.workflowState.getGraphForTab(this.tabId()).connections);
  /** The page's widgets, for the nodes' button and label pickers. */
  readonly pageItems = computed(() => flattenTree(this.layoutState.getLayout(this.tabId())));
  /** The layout page's id, unless it's the page being edited. */
  private readonly layoutPageId = computed(() => {
    const id = this.pages.layoutPage()?.id;
    return id != null && String(id) !== this.tabId() ? String(id) : null;
  });
  /** Widgets whose events can start this page's flows: its own and the layout page's (they run the open page's flows). */
  readonly triggerItems = computed(() => {
    const layoutId = this.layoutPageId();
    return layoutId ? [...this.pageItems(), ...flattenTree(this.layoutState.getLayout(layoutId))] : this.pageItems();
  });

  /** What the nodes' expressions can use: the page's names, then the flow's own values. */
  readonly scope = computed<ScopeEntry[]>(() => [...this.scopes.entries(this.tabId()), ...FLOW_LOCALS]);
  /** The variables the page sees (the "variable changes" trigger). */
  readonly variables = computed(() => this.variablesService.visible(this.tabId()));

  // ─── Viewport (screen = pan + world × zoom) ──────────────────────────────
  readonly zoom = signal(1);
  readonly pan = signal<Point>({ x: 0, y: 0 });
  readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));
  /** The blueprint grid behind the nodes (like the page canvas), anchored to the world's origin. */
  readonly backdropGrid = computed(() => blueprintGridStyle(this.pan(), this.zoom(), 'top-left'));

  /** The border: the world area, grown to include any node that already sits outside it. */
  readonly bounds = computed<Rect>(() => boundingBox([WORKFLOW_WORLD, ...this.nodes().map(nodeRect)])!);

  /** The border drawn on screen. */
  readonly boundsStyle = computed(() => {
    const b = this.bounds(), z = this.zoom(), p = this.pan();
    return { left: `${p.x + b.x * z}px`, top: `${p.y + b.y * z}px`, width: `${b.w * z}px`, height: `${b.h * z}px` };
  });

  readonly contextMenu = signal<WorkflowContextMenu | null>(null);
  readonly icons = {
    add: LucidePlus,
    addIfTrue: LucideCircleCheck,
    addIfFalse: LucideCircleX,
    delete: LucideTrash2,
    unlink: LucideUnlink,
  };

  /** Panning is ours (Space/middle drag, like the page canvas), so Foblex never drags the canvas. */
  readonly canvasMoveTrigger = () => false;
  /** Holding Space means "pan", so it must not pick up a node. */
  readonly nodeMoveTrigger = () => !this.controls().spaceHeld();

  constructor() {
    // Load the workflow and the page's widgets whenever the tab changes, then fit the nodes into view
    effect(() => {
      const tabId = this.tabId();
      if (tabId) untracked(() => this.load(tabId));
    });
    // The layout page's widgets too, for the trigger picker
    this.pages.ensureLoaded();
    effect(() => {
      const layoutId = this.layoutPageId();
      if (layoutId) untracked(() => this.layoutState.loadLayoutForTab(layoutId).subscribe({
        error: (err) => console.error('Failed to load the layout page widgets', err),
      }));
    });
  }

  private load(tabId: string): void {
    this.workflowState.ensureGraph(tabId).subscribe({
      next: () => requestAnimationFrame(() => this.zoomFit()),
      error: (err) => console.error('Failed to load the page workflow', err),
    });
    this.layoutState.loadLayoutForTab(tabId).subscribe({
      error: (err) => console.error('Failed to load the page widgets', err),
    });
  }

  // ─── Toolbar ─────────────────────────────────────────────────────────────
  addNode(type: FlowNode['type']): void {
    // Drop it in the middle of what's currently visible
    const { w, h } = this.viewportSize();
    const center = this.toWorld({ x: w / 2, y: h / 2 });
    const position = clampNodePosition({ x: center.x - WORKFLOW_NODE_WIDTH / 2, y: center.y - WORKFLOW_NODE_HEIGHT / 2 });

    this.record('Add node', () => this.workflowState.addNode(this.tabId(), newNode(type, position)));
  }

  updateNode(node: FlowNode): void {
    const old = this.nodes().find((n) => n.id === node.id);
    const moved = old && JSON.stringify({ ...old, position: node.position }) === JSON.stringify(node);
    this.record(moved ? 'Move node' : 'Edit node', () => this.workflowState.updateNode(this.tabId(), node));
  }

  deleteNode(nodeId: string): void {
    this.closeContextMenu();
    this.record('Delete node', () => this.workflowState.deleteNode(this.tabId(), nodeId));
  }

  /** Runs a change to the workflow and records it as one undoable step. */
  private record(label: string, change: () => Observable<unknown> | void): void {
    recordGraphChange(this.history, this.workflowState, this.tabId(), label, change);
  }

  // ─── Context menu ────────────────────────────────────────────────────────
  openNodeMenu(event: MouseEvent, node: FlowNode): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenu.set({ kind: 'node', x: event.clientX, y: event.clientY, node });
  }

  openConnectionMenu(event: MouseEvent, connectionId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenu.set({ kind: 'connection', x: event.clientX, y: event.clientY, connectionId });
  }

  closeContextMenu(): void {
    this.contextMenu.set(null);
  }

  /** An action node's outputs, for "Add action" (most have just one). */
  portsOf(node: FlowNode) {
    return node.type === 'Action' ? actionPorts(node.actionType) : [];
  }

  /** New action wired to one of the node's outputs. */
  addActionAfter(nodeId: string, port = 'out'): void {
    this.closeContextMenu();
    this.record('Add action', () => this.workflowState.addActionAfter(this.tabId(), nodeId, port));
  }

  deleteConnection(connectionId: string): void {
    this.closeContextMenu();
    this.record('Delete connection', () => this.workflowState.disconnect(this.tabId(), connectionId));
  }

  // ─── Foblex events ───────────────────────────────────────────────────────
  onCanvasChange(event: FCanvasChangeEvent): void {
    const p = this.pan();
    if (event.scale === this.zoom() && event.position.x === p.x && event.position.y === p.y) return;
    this.setView(event.position, event.scale);
  }

  onNodePositionChange(node: FlowNode, position: Point): void {
    // Dropped past the border → snap back inside
    this.updateNode({ ...node, position: clampNodePosition(position) });
  }

  onConnectionCreated(event: FCreateConnectionEvent): void {
    if (!event.targetId) return;
    const from = splitPortId(event.sourceId);
    this.record('Connect', () => this.workflowState.connect(this.tabId(), from.nodeId, from.port, splitPortId(event.targetId!).nodeId));
  }

  onConnectionReassigned(event: FReassignConnectionEvent): void {
    const connection = this.connections().find((c) => c.id === event.connectionId);
    if (!event.nextTargetId || !connection) return;
    // Edges are immutable in the backend: replace the old one
    const from = splitPortId(connection.fromPort);
    const target = splitPortId(event.nextTargetId).nodeId;
    this.record('Reconnect', () => {
      this.workflowState.disconnect(this.tabId(), connection.id);
      this.workflowState.connect(this.tabId(), from.nodeId, from.port, target);
    });
  }

  onDeleteSelected(event: FDeleteSelectedEvent): void {
    this.record('Delete', () => {
      (event.connectionIds ?? []).forEach((id) => this.workflowState.disconnect(this.tabId(), id));
      (event.nodeIds ?? []).forEach((id) => this.workflowState.deleteNode(this.tabId(), id));
    });
  }

  // ─── Pan & zoom ──────────────────────────────────────────────────────────
  onPanBy(delta: Point): void {
    const p = this.pan();
    this.setView({ x: p.x + delta.x, y: p.y + delta.y }, this.zoom());
  }

  onZoomAt({ factor, client }: ZoomAtEvent): void {
    const rect = this.flowEl().nativeElement.getBoundingClientRect();
    this.zoomTo(this.zoom() * factor, { x: client.x - rect.left, y: client.y - rect.top });
  }

  onCommand(command: ViewportCommand): void {
    switch (command) {
      case 'zoom-in': this.zoomIn(); break;
      case 'zoom-out': this.zoomOut(); break;
      case 'zoom-reset': this.zoomReset(); break;
      case 'fit': this.zoomFit(); break;
    }
  }

  zoomIn(): void { this.zoomTo(this.zoom() * BUTTON_ZOOM_STEP); }
  zoomOut(): void { this.zoomTo(this.zoom() / BUTTON_ZOOM_STEP); }
  zoomReset(): void { this.zoomTo(1); }

  /** Fit all nodes into view (never magnified past 100%). */
  zoomFit(): void {
    const viewport = this.viewportSize();
    if (!viewport.w || !viewport.h) return;

    const box = boundingBox(this.nodes().map((n) => this.renderedNodeRect(n)));
    if (!box) {
      this.setView({ x: viewport.w / 2, y: viewport.h / 2 }, 1);
      return;
    }
    const { pan, zoom } = fitToViewport(box, viewport, WORKFLOW_FIT_PADDING, WORKFLOW_MIN_ZOOM, 1);
    this.setView(pan, zoom);
  }

  /** Zoom around a screen point (the viewport's center by default). */
  private zoomTo(zoom: number, anchor: Point = this.viewportCenter()): void {
    const newZoom = clamp(zoom, WORKFLOW_MIN_ZOOM, WORKFLOW_MAX_ZOOM);
    this.setView(zoomAround(anchor, this.pan(), this.zoom(), newZoom), newZoom);
  }

  /** Apply a view, keeping part of the border area on screen so the nodes can't get lost. */
  private setView(pan: Point, zoom: number): void {
    this.zoom.set(zoom);
    this.pan.set(clampPanToBounds(pan, zoom, this.viewportSize(), this.bounds(), WORKFLOW_KEEP_VISIBLE));
  }

  /** A node's rect with its real rendered size. */
  private renderedNodeRect(node: FlowNode): Rect {
    const el = this.flowEl().nativeElement.querySelector<HTMLElement>(`[data-node-id="${node.id}"]`);
    return { ...node.position, w: el?.offsetWidth || WORKFLOW_NODE_WIDTH, h: el?.offsetHeight || WORKFLOW_NODE_HEIGHT };
  }

  private toWorld(screen: Point): Point {
    const p = this.pan(), z = this.zoom();
    return { x: (screen.x - p.x) / z, y: (screen.y - p.y) / z };
  }

  private viewportSize(): { w: number; h: number } {
    const el = this.flowEl().nativeElement;
    return { w: el.clientWidth, h: el.clientHeight };
  }

  private viewportCenter(): Point {
    const { w, h } = this.viewportSize();
    return { x: w / 2, y: h / 2 };
  }
}

/** A node's rect using the estimated node size. */
const nodeRect = (node: FlowNode): Rect => ({ ...node.position, w: WORKFLOW_NODE_WIDTH, h: WORKFLOW_NODE_HEIGHT });

/** Keep a node fully inside the border. */
function clampNodePosition(p: Point): Point {
  return {
    x: clamp(p.x, WORKFLOW_WORLD.x, WORKFLOW_WORLD.x + WORKFLOW_WORLD.w - WORKFLOW_NODE_WIDTH),
    y: clamp(p.y, WORKFLOW_WORLD.y, WORKFLOW_WORLD.y + WORKFLOW_WORLD.h - WORKFLOW_NODE_HEIGHT),
  };
}

/** A fresh node of the given type with default settings. */
function newNode(type: FlowNode['type'], position: Point): NewFlowNode {
  switch (type) {
    case 'Trigger':
      return { type, position, triggerType: 'page_load' };
    case 'Condition':
      return { type, position, expression: '' };
    case 'Action': {
      const action = ACTION_TYPES[0];
      return { type, position, actionType: action.id, config: { ...action.defaultConfig } };
    }
  }
}
