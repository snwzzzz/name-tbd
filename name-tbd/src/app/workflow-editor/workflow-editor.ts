import { Component, computed, signal, ViewChild, HostListener, inject } from '@angular/core';
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
import { forkJoin } from 'rxjs';

/** Port ids are `${nodeId}-${port}`; node ids never contain '-' (they are DB ids). */
const splitPortId = (portId: string) => {
  const i = portId.lastIndexOf('-');
  return { nodeId: portId.slice(0, i), port: portId.slice(i + 1) };
};

@Component({
  selector: 'app-workflow-editor',
  standalone: true,
  imports: [FFlowModule, FormsModule],
  templateUrl: './workflow-editor.html',
  styleUrl: './workflow-editor.scss'
})
export class WorkflowEditor {
  @ViewChild(FCanvasComponent) fCanvas!: FCanvasComponent;

  private route = inject(ActivatedRoute);
  private workflowState = inject(WorkflowStateService);
  private layoutState = inject(LayoutStateService);

  tabId = signal<string>('');

  // ─── State (owned by WorkflowStateService, which persists every change) ──
  nodes = computed(() => this.workflowState.getGraphForTab(this.tabId()).nodes);
  connections = computed(() => this.workflowState.getGraphForTab(this.tabId()).connections);
  operators = CONDITION_OPERATORS;
  actionTypes = ACTION_TYPES;

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

  // ─── Zoom & Pan ──────────────────────────────────────────────────────────
  readonly zoom = signal(1);
  readonly panPos = signal({ x: 0, y: 0 });
  readonly isPanning = signal(false);
  readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));

  private spaceHeld = false;
  private middleMouseDown = false;
  private activelyPanning = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('tabId');
      if (id) {
        this.tabId.set(id);
        // Load the workflow and the page's widgets (they feed the button/label pickers)
        forkJoin([this.workflowState.ensureGraph(id), this.layoutState.loadLayoutForTab(id)]).subscribe({
          error: (err) => console.error('Failed to load the page workflow', err),
        });
      }
    });
  }

  // ─── Event Listeners ─────────────────────────────────────────────────────
  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (e.code === 'Space') {
      const tag = (document.activeElement as HTMLElement)?.tagName ?? '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      e.preventDefault();
      this.spaceHeld = true;
      this.isPanning.set(true);
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

  @HostListener('window:mouseup', ['$event'])
  onMouseUp(e: MouseEvent): void {
    this.activelyPanning = false;
    this.middleMouseDown = false;
    if (!this.spaceHeld) this.isPanning.set(false);
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

    // Calculate unzoomed delta
    const currentZoom = this.zoom();
    const dx = (e.clientX - this.lastMouseX) / currentZoom;
    const dy = (e.clientY - this.lastMouseY) / currentZoom;

    this.panPos.update(p => ({ x: p.x + dx, y: p.y + dy }));

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  // ─── Actions ─────────────────────────────────────────────────────────────
  addNode(type: string): void {
    const currentPan = this.panPos();
    const currentZoom = this.zoom();
    const position = {
      x: (-currentPan.x) + (400 / currentZoom),
      y: (-currentPan.y) + (300 / currentZoom),
    };

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
  onLoaded(): void {
    console.log('[WORKFLOW EDITOR] Flow loaded.');
  }

  onCanvasChange(event: FCanvasChangeEvent): void {
    this.zoom.set(event.scale);
    this.panPos.set(event.position);
  }

  onNodePositionChange(nodeId: string, position: { x: number, y: number }): void {
    const node = this.nodes().find(n => n.id === nodeId);
    if (node) this.workflowState.updateNode(this.tabId(), { ...node, position });
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
  zoomIn(): void {
    this._clampZoom(this.zoom() * 1.25);
  }

  zoomOut(): void {
    this._clampZoom(this.zoom() * 0.8);
  }

  zoomReset(): void {
    this.zoom.set(1);
    this.panPos.set({ x: 0, y: 0 });
  }

  zoomFit(): void {
    if (this.nodes().length === 0) return;

    const xs = this.nodes().map(n => n.position.x);
    const ys = this.nodes().map(n => n.position.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const boundsW = (maxX - minX) + 200;
    const boundsH = (maxY - minY) + 100;

    const scaleX = window.innerWidth / Math.max(boundsW, 1);
    const scaleY = window.innerHeight / Math.max(boundsH, 1);
    const fitScale = Math.min(scaleX, scaleY) * 0.8;

    this._clampZoom(fitScale);

    this.panPos.set({
      x: -minX + (window.innerWidth / fitScale - boundsW) / 2,
      y: -minY + (window.innerHeight / fitScale - boundsH) / 2
    });
  }

  private _clampZoom(z: number): void {
    this.zoom.set(Math.max(0.1, Math.min(z, 5)));
  }
}
