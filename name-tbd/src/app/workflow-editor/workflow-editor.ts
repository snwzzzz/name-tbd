import { Component, computed, signal, ViewChild, HostListener, inject, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  FFlowModule,
  FCanvasComponent,
  FCreateConnectionEvent,
  FReassignConnectionEvent,
  FCanvasChangeEvent,
  FDeleteSelectedEvent
} from '@foblex/flow';
import { WorkflowStateService } from '../services/workflow-state.service';
import { LayoutItem, LayoutStateService } from '../services/layout-state.service';
import { FlowNode, TriggerNode, ConditionNode, ActionNode, SetTextConfig } from './workflow.types';
import { ACTION_TYPES, CONDITION_OPERATORS } from './workflow-operators';
import { FormsModule } from '@angular/forms';
import { SelectOption, UiSelect } from '../ui-select/ui-select';
import { LucideCircleCheck, LucideCircleX, LucideGitBranch, LucidePlus, LucideTrash2, LucideUnlink, LucideWrench, LucideX, LucideZap, LucideFileText, LucideMousePointerClick, LucideType } from '@lucide/angular';
import { forkJoin } from 'rxjs';

/** Port ids are `${nodeId}-${port}`; node ids never contain '-' (they are DB ids). */
const splitPortId = (portId: string) => {
  const i = portId.lastIndexOf('-');
  return { nodeId: portId.slice(0, i), port: portId.slice(i + 1) };
};

interface Rect { x: number; y: number; w: number; h: number; }

/** The area nodes live in (world coordinates). Nodes can't be dropped outside it. */
const WORLD: Rect = { x: -2000, y: -1500, w: 5000, h: 3500 };
/** Rough node size, used to keep a dropped node fully inside the border. */
const NODE_W = 240;
const NODE_H = 160;
/** How much of the border area (in screen px) always stays in view while panning. */
const KEEP_VISIBLE = 120;
/** Same limits as the page canvas. */
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 4;

type ContextMenu =
  | { kind: 'node'; x: number; y: number; node: FlowNode }
  | { kind: 'connection'; x: number; y: number; connectionId: string };

@Component({
  selector: 'app-workflow-editor',
  standalone: true,
  imports: [FFlowModule, FormsModule, UiSelect, LucideZap, LucideGitBranch, LucideWrench, LucideX, LucidePlus, LucideCircleCheck, LucideCircleX, LucideTrash2, LucideUnlink],
  templateUrl: './workflow-editor.html',
  styleUrl: './workflow-editor.scss'
})
export class WorkflowEditor implements AfterViewInit, OnDestroy {
  @ViewChild(FCanvasComponent) fCanvas!: FCanvasComponent;
  @ViewChild('flowEl', { read: ElementRef }) flowEl!: ElementRef<HTMLElement>;

  private route = inject(ActivatedRoute);
  private workflowState = inject(WorkflowStateService);
  private layoutState = inject(LayoutStateService);

  tabId = signal<string>('');

  // ─── State (owned by WorkflowStateService, which persists every change) ──
  nodes = computed(() => this.workflowState.getGraphForTab(this.tabId()).nodes);
  connections = computed(() => this.workflowState.getGraphForTab(this.tabId()).connections);

  /** Widgets of the page, flattened, so nodes can point at them. */
  private pageItems = computed(() => {
    const flat: LayoutItem[] = [];
    const walk = (items: LayoutItem[]) => items.forEach((i) => { flat.push(i); if (i.children) walk(i.children); });
    walk(this.layoutState.getLayout(this.tabId()));
    return flat;
  });
  buttons = computed(() => this.pageItems()
    .filter((i) => i.type === 'button' && typeof i.id === 'number')
    .map((i) => ({ id: i.id!.toString(), name: `“${this.propOf(i, 'label') ?? 'Click Me'}” (#${i.id})` })));
  labels = computed(() => this.pageItems()
    .filter((i) => i.type === 'label' && typeof i.id === 'number')
    .map((i) => ({ id: i.id!.toString(), name: `${this.propOf(i, 'text') ?? 'New Label'} (#${i.id})` })));

  // ─── Dropdown options ────────────────────────────────────────────────────
  triggerOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'the page loads', icon: LucideFileText },
    ...this.buttons().map((b) => ({ value: b.id, label: `button ${b.name} is clicked`, icon: LucideMousePointerClick })),
  ]);
  labelOptions = computed<SelectOption[]>(() =>
    this.labels().map((l) => ({ value: l.id, label: l.name, icon: LucideType })));
  readonly actionTypeOptions: SelectOption[] = ACTION_TYPES.map((a) => ({ value: a.id, label: a.label }));
  readonly operatorOptions: SelectOption[] = CONDITION_OPERATORS.map((o) => ({ value: o.id, label: o.label }));

  // ─── Zoom & Pan (screen = pan + world * zoom) ─────────────────────────────
  readonly zoom = signal(1);
  readonly panPos = signal({ x: 0, y: 0 });
  readonly isPanning = signal(false);
  readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));

  /** The border: the world area, grown to include any node that already sits outside it. */
  readonly bounds = computed<Rect>(() => {
    let { x: minX, y: minY } = WORLD;
    let maxX = WORLD.x + WORLD.w, maxY = WORLD.y + WORLD.h;
    for (const n of this.nodes()) {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + NODE_W);
      maxY = Math.max(maxY, n.position.y + NODE_H);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  });

  /** The border drawn on screen. */
  readonly boundsStyle = computed(() => {
    const b = this.bounds(), z = this.zoom(), p = this.panPos();
    return {
      left: `${p.x + b.x * z}px`,
      top: `${p.y + b.y * z}px`,
      width: `${b.w * z}px`,
      height: `${b.h * z}px`,
    };
  });

  readonly contextMenu = signal<ContextMenu | null>(null);

  private spaceHeld = false;
  private middleMouseDown = false;
  private activelyPanning = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private fittedOnLoad = false;
  private readonly onWheel = (e: WheelEvent) => this.handleWheel(e);

  /** Panning is ours (Space/middle drag, like the page canvas), so Foblex never drags the canvas. */
  readonly canvasMoveTrigger = () => false;
  /** Holding Space means "pan", so it must not pick up a node. */
  readonly nodeMoveTrigger = () => !this.spaceHeld;

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('tabId');
      if (id) {
        this.tabId.set(id);
        this.fittedOnLoad = false;
        // Load the workflow and the page's widgets (they feed the button/label pickers)
        forkJoin([this.workflowState.ensureGraph(id), this.layoutState.loadLayoutForTab(id)]).subscribe({
          next: () => requestAnimationFrame(() => {
            if (this.fittedOnLoad) return;
            this.fittedOnLoad = true;
            this.zoomFit();
          }),
          error: (err) => console.error('Failed to load the page workflow', err),
        });
      }
    });
  }

  ngAfterViewInit(): void {
    // Non-passive so the browser doesn't scroll/zoom the page itself
    this.flowEl.nativeElement.addEventListener('wheel', this.onWheel, { passive: false });
  }

  ngOnDestroy(): void {
    this.flowEl?.nativeElement.removeEventListener('wheel', this.onWheel);
  }

  // ─── Event Listeners ─────────────────────────────────────────────────────
  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.closeContextMenu();
    if (e.repeat) return;
    if (e.code === 'Space') {
      const tag = (document.activeElement as HTMLElement)?.tagName ?? '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      e.preventDefault();
      this.spaceHeld = true;
      this.isPanning.set(true);
    }
    // Ctrl+0 = reset zoom, Ctrl++/= = zoom in, Ctrl+- = zoom out, Ctrl+F = fit
    if (e.ctrlKey || e.metaKey) {
      if (e.key === '0') { e.preventDefault(); this.zoomReset(); }
      if (e.key === '=' || e.key === '+') { e.preventDefault(); this.zoomIn(); }
      if (e.key === '-') { e.preventDefault(); this.zoomOut(); }
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); this.zoomFit(); }
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.spaceHeld = false;
      if (!this.middleMouseDown) this.isPanning.set(false);
      this.activelyPanning = false;
    }
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    this.activelyPanning = false;
    this.middleMouseDown = false;
    if (!this.spaceHeld) this.isPanning.set(false);
  }

  /** Any press outside the context menu closes it. */
  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(e: PointerEvent): void {
    if ((e.target as HTMLElement | null)?.closest?.('.flow-context-menu')) return;
    this.closeContextMenu();
  }

  onViewportMouseDown(e: MouseEvent): void {
    if (e.button === 1) {
      e.preventDefault();
      this.middleMouseDown = true;
      this.activelyPanning = true;
      this.isPanning.set(true);
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else if (e.button === 0 && this.spaceHeld) {
      e.preventDefault();
      this.activelyPanning = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  }

  onViewportMouseMove(e: MouseEvent): void {
    if (!this.activelyPanning) return;
    const p = this.panPos();
    this.setView({ x: p.x + e.clientX - this.lastMouseX, y: p.y + e.clientY - this.lastMouseY }, this.zoom());
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    this.closeContextMenu();
    const p = this.panPos();

    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Scroll → zoom toward cursor
      const rect = this.flowEl.nativeElement.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      this.zoomAround({ x: e.clientX - rect.left, y: e.clientY - rect.top }, this.zoom() * factor);
    } else if (e.shiftKey) {
      // Shift+Scroll → horizontal pan
      this.setView({ x: p.x - e.deltaY, y: p.y }, this.zoom());
    } else {
      // Plain scroll → vertical / trackpad pan
      this.setView({ x: p.x - e.deltaX, y: p.y - e.deltaY }, this.zoom());
    }
  }

  // ─── Actions ─────────────────────────────────────────────────────────────
  addNode(type: string): void {
    // Drop it in the middle of what's currently visible
    const { w, h } = this.viewportSize();
    const center = this.toWorld({ x: w / 2, y: h / 2 });
    const position = this.clampNodePosition({ x: center.x - NODE_W / 2, y: center.y - NODE_H / 2 });

    let newNode: Omit<FlowNode, 'id'>;
    if (type === 'Trigger') {
      newNode = { position, type: 'Trigger', triggerType: 'page_load' } as Omit<TriggerNode, 'id'>;
    } else if (type === 'Condition') {
      newNode = { position, type: 'Condition', condition: { field: '', operator: 'equals', value: '' } } as Omit<ConditionNode, 'id'>;
    } else {
      const action = ACTION_TYPES[0];
      newNode = { position, type: 'Action', actionType: action.id, config: { ...action.defaultConfig } } as Omit<ActionNode, 'id'>;
    }

    this.workflowState.addNode(this.tabId(), newNode).subscribe({
      error: (err) => console.error('Failed to create workflow node', err),
    });
  }

  updateCondition(nodeId: string, field: string, operator: string, value: any) {
    const node = this.nodes().find(n => n.id === nodeId);
    if (node?.type === 'Condition') {
      this.workflowState.updateNode(this.tabId(), { ...node, condition: { field, operator, value } });
    }
  }

  setActionType(node: FlowNode, actionType: string): void {
    const action = ACTION_TYPES.find((a) => a.id === actionType);
    if (node.type !== 'Action' || !action) return;
    this.workflowState.updateNode(this.tabId(), { ...node, actionType, config: { ...action.defaultConfig } });
  }

  /** Point a trigger at a button's click, or back to page load when no button is chosen. */
  setTriggerElement(node: FlowNode, elementId: string): void {
    if (node.type !== 'Trigger') return;
    const updated: TriggerNode = elementId
      ? { ...node, triggerType: 'element_click', eventName: 'element_click', elementId }
      : { ...node, triggerType: 'page_load', eventName: undefined, elementId: undefined };
    this.workflowState.updateNode(this.tabId(), updated);
  }

  updateConfig(node: FlowNode, patch: Partial<SetTextConfig>): void {
    if (node.type !== 'Action') return;
    this.workflowState.updateNode(this.tabId(), { ...node, config: { ...node.config, ...patch } });
  }

  // ─── Context menu ────────────────────────────────────────────────────────
  openNodeMenu(e: MouseEvent, node: FlowNode): void {
    e.preventDefault();
    e.stopPropagation();
    this.contextMenu.set({ kind: 'node', x: e.clientX, y: e.clientY, node });
  }

  openConnectionMenu(e: MouseEvent, connectionId: string): void {
    e.preventDefault();
    e.stopPropagation();
    this.contextMenu.set({ kind: 'connection', x: e.clientX, y: e.clientY, connectionId });
  }

  closeContextMenu(): void {
    if (this.contextMenu()) this.contextMenu.set(null);
  }

  /** New action wired to one of the node's outputs. */
  addActionAfter(nodeId: string, port: string = 'out'): void {
    this.closeContextMenu();
    this.workflowState.addActionAfter(this.tabId(), nodeId, port).subscribe({
      error: (err) => console.error('Failed to add an action', err),
    });
  }

  deleteConnection(connectionId: string): void {
    this.closeContextMenu();
    this.workflowState.disconnect(this.tabId(), connectionId);
  }

  // ─── Helpers for the template ────────────────────────────────────────────
  asTrigger(node: FlowNode): TriggerNode { return node as TriggerNode; }
  asCondition(node: FlowNode): ConditionNode { return node as ConditionNode; }
  asAction(node: FlowNode): ActionNode { return node as ActionNode; }
  setTextConfig(node: FlowNode): SetTextConfig { return (node as ActionNode).config as SetTextConfig; }

  /** Label and color of the button a trigger belongs to (null if the element isn't a button). */
  triggerButton(elementId?: string): { label: string; color: string } | null {
    const item = this.pageItems().find((i) => i.id?.toString() === elementId);
    if (item?.type !== 'button') return null;
    return {
      label: this.propOf(item, 'label') ?? 'Click Me',
      color: this.propOf(item, 'color') ?? '#3b82f6',
    };
  }

  /** "Button “Save”" for a click trigger's element. */
  elementName(elementId?: string): string {
    const item = this.pageItems().find((i) => i.id?.toString() === elementId);
    if (!item) return `Element #${elementId}`;
    const text = item.type === 'button' ? this.propOf(item, 'label') ?? 'Click Me' : this.propOf(item, 'text');
    const type = (item.type ?? 'element').replace(/^./, (c) => c.toUpperCase());
    return text ? `${type} “${text}”` : `${type} #${item.id}`;
  }

  private propOf(item: LayoutItem, key: string): string | undefined {
    return (item.props as Record<string, any> | undefined)?.[key] ?? undefined;
  }

  // ─── Foblex Handlers ─────────────────────────────────────────────────────
  onCanvasChange(event: FCanvasChangeEvent): void {
    const p = this.panPos();
    if (event.scale === this.zoom() && event.position.x === p.x && event.position.y === p.y) return;
    this.setView(event.position, event.scale);
  }

  onNodePositionChange(nodeId: string, position: { x: number, y: number }): void {
    const node = this.nodes().find(n => n.id === nodeId);
    // Dropped past the border → snap back inside
    if (node) this.workflowState.updateNode(this.tabId(), { ...node, position: this.clampNodePosition(position) });
  }

  onConnectionCreated(event: FCreateConnectionEvent): void {
    if (!event.targetId) return;
    const from = splitPortId(event.sourceId);
    const to = splitPortId(event.targetId);
    this.workflowState.connect(this.tabId(), from.nodeId, from.port, to.nodeId);
  }

  onConnectionReassigned(event: FReassignConnectionEvent): void {
    if (!event.nextTargetId) return;
    const conn = this.connections().find(c => c.id === event.connectionId);
    if (!conn) return;
    // Edges are immutable in the backend: replace the old one
    this.workflowState.disconnect(this.tabId(), conn.id);
    const from = splitPortId(conn.fromPort);
    this.workflowState.connect(this.tabId(), from.nodeId, from.port, splitPortId(event.nextTargetId).nodeId);
  }

  deleteNode(nodeId: string): void {
    this.closeContextMenu();
    if (!this.nodes().some(n => n.id === nodeId)) return;
    this.workflowState.deleteNode(this.tabId(), nodeId);
  }

  onDeleteSelected(event: FDeleteSelectedEvent): void {
    const connIds = event.connectionIds ?? [];
    const nodeIds = (event.nodeIds ?? []).filter((id) => this.nodes().some(n => n.id === id));

    connIds.forEach((id) => this.workflowState.disconnect(this.tabId(), id));
    nodeIds.forEach((id) => this.workflowState.deleteNode(this.tabId(), id));
  }

  // ─── Zoom Controls ───────────────────────────────────────────────────────
  zoomIn(): void { this.zoomAround(this.viewportCenter(), this.zoom() * 1.25); }
  zoomOut(): void { this.zoomAround(this.viewportCenter(), this.zoom() / 1.25); }
  zoomReset(): void { this.zoomAround(this.viewportCenter(), 1); }

  /** Fit all nodes into view (never magnified past 100%). */
  zoomFit(): void {
    const { w, h } = this.viewportSize();
    if (!w || !h) return;

    const els = Array.from(this.flowEl.nativeElement.querySelectorAll<HTMLElement>('.workflow-node[data-node-id]'));
    const boxes = this.nodes().map((n) => {
      const el = els.find((e) => e.dataset['nodeId'] === n.id);
      return { x: n.position.x, y: n.position.y, w: el?.offsetWidth || NODE_W, h: el?.offsetHeight || NODE_H };
    });
    if (boxes.length === 0) {
      this.setView({ x: w / 2, y: h / 2 }, 1);
      return;
    }

    const minX = Math.min(...boxes.map((b) => b.x));
    const minY = Math.min(...boxes.map((b) => b.y));
    const maxX = Math.max(...boxes.map((b) => b.x + b.w));
    const maxY = Math.max(...boxes.map((b) => b.y + b.h));
    const padding = 56;
    const z = this.clampZoom(Math.min(
      (w - padding * 2) / Math.max(maxX - minX, 1),
      (h - padding * 2) / Math.max(maxY - minY, 1),
      1,
    ));
    this.setView({
      x: (w - (maxX - minX) * z) / 2 - minX * z,
      y: (h - (maxY - minY) * z) / 2 - minY * z,
    }, z);
  }

  /** Change the zoom while keeping the world point under `anchor` (screen px) in place. */
  private zoomAround(anchor: { x: number; y: number }, zoom: number): void {
    const newZoom = this.clampZoom(zoom);
    const ratio = newZoom / this.zoom();
    const p = this.panPos();
    this.setView({ x: anchor.x - (anchor.x - p.x) * ratio, y: anchor.y - (anchor.y - p.y) * ratio }, newZoom);
  }

  /** Apply a view, keeping part of the border area on screen so the nodes can't get lost. */
  private setView(pan: { x: number; y: number }, zoom: number): void {
    const { w, h } = this.viewportSize();
    const b = this.bounds();
    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
    const keepX = Math.min(KEEP_VISIBLE, w / 2), keepY = Math.min(KEEP_VISIBLE, h / 2);
    this.zoom.set(zoom);
    this.panPos.set({
      x: clamp(pan.x, keepX - (b.x + b.w) * zoom, w - keepX - b.x * zoom),
      y: clamp(pan.y, keepY - (b.y + b.h) * zoom, h - keepY - b.y * zoom),
    });
  }

  private clampNodePosition(p: { x: number; y: number }): { x: number; y: number } {
    return {
      x: Math.min(Math.max(p.x, WORLD.x), WORLD.x + WORLD.w - NODE_W),
      y: Math.min(Math.max(p.y, WORLD.y), WORLD.y + WORLD.h - NODE_H),
    };
  }

  private toWorld(screen: { x: number; y: number }): { x: number; y: number } {
    const p = this.panPos(), z = this.zoom();
    return { x: (screen.x - p.x) / z, y: (screen.y - p.y) / z };
  }

  private viewportSize(): { w: number; h: number } {
    const el = this.flowEl?.nativeElement;
    return { w: el?.clientWidth ?? 0, h: el?.clientHeight ?? 0 };
  }

  private viewportCenter(): { x: number; y: number } {
    const { w, h } = this.viewportSize();
    return { x: w / 2, y: h / 2 };
  }

  private clampZoom(z: number): number {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
  }
}
