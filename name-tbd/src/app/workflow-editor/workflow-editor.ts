import { Component, computed, signal, ViewChild, AfterViewInit, HostListener, effect, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { 
  FFlowModule, 
  FCanvasComponent, 
  FCreateConnectionEvent, 
  FReassignConnectionEvent,
  FCanvasChangeEvent
} from '@foblex/flow';
import { WorkflowStateService } from '../services/workflow-state.service';
import { FlowNode, FlowConnection, TriggerNode, ConditionNode, ActionNode } from './workflow.types';
import { CONDITION_OPERATORS } from './workflow-operators';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-workflow-editor',
  standalone: true,
  imports: [FFlowModule, FormsModule],
  templateUrl: './workflow-editor.html',
  styleUrl: './workflow-editor.scss'
})
export class WorkflowEditor implements AfterViewInit {
  @ViewChild(FCanvasComponent) fCanvas!: FCanvasComponent;

  private route = inject(ActivatedRoute);
  private workflowState = inject(WorkflowStateService);
  
  tabId = signal<string>('');

  // ─── State ───────────────────────────────────────────────────────────────
  nodes = signal<FlowNode[]>([]);
  connections = signal<FlowConnection[]>([]);
  operators = CONDITION_OPERATORS;

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
    effect(() => {
      const id = this.tabId();
      if (id) {
        const state = this.workflowState.getGraphForTab(id);
        // Only set if they differ to avoid loops, or just set
        if (state.nodes !== this.nodes()) this.nodes.set(state.nodes);
        if (state.connections !== this.connections()) this.connections.set(state.connections);
      }
    }, { allowSignalWrites: true });

    this.route.paramMap.subscribe(params => {
      const id = params.get('tabId');
      if (id) {
        this.tabId.set(id);
        this.workflowState.loadGraphForTab(id);
      }
    });
  }

  private saveStateToService() {
    const currentTab = this.tabId();
    if (currentTab) {
      this.workflowState.updateGraphForTab(currentTab, {
        nodes: this.nodes(),
        connections: this.connections()
      });
    }
  }

  ngAfterViewInit(): void {
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
    const centerX = (-currentPan.x) + (400 / currentZoom);
    const centerY = (-currentPan.y) + (300 / currentZoom);

    const base = {
      id: `node-${Date.now()}`,
      position: { x: centerX, y: centerY },
    };

    let newNode: FlowNode;
    
    if (type === 'Trigger') {
      newNode = { ...base, type: 'Trigger', triggerType: 'page_load' } as TriggerNode;
    } else if (type === 'Condition') {
      newNode = { ...base, type: 'Condition', condition: { field: '', operator: 'equals', value: '' } } as ConditionNode;
    } else {
      newNode = { ...base, type: 'Action', actionType: 'show_message', config: {} } as ActionNode;
    }

    this.nodes.update(ns => [...ns, newNode]);
    this.saveStateToService();
    this.workflowState.addNodeToAPI(this.tabId(), newNode);
  }

  updateCondition(nodeId: string, field: string, operator: string, value: any) {
    let updatedNode: FlowNode | undefined;
    this.nodes.update(ns => ns.map(n => {
      if (n.id === nodeId && n.type === 'Condition') {
        updatedNode = { ...n, condition: { field, operator, value } } as ConditionNode;
        return updatedNode;
      }
      return n;
    }));
    this.saveStateToService();
    if (updatedNode) {
      this.workflowState.updateNodeInAPI(this.tabId(), updatedNode);
    }
  }

  // ─── Helpers to cast ─────────────────────────────────────────────────────
  asTrigger(node: FlowNode): TriggerNode { return node as TriggerNode; }
  asCondition(node: FlowNode): ConditionNode { return node as ConditionNode; }
  asAction(node: FlowNode): ActionNode { return node as ActionNode; }

  // ─── Foblex Handlers ─────────────────────────────────────────────────────
  onLoaded(): void {
    console.log('[WORKFLOW EDITOR] Flow loaded.');
  }

  onCanvasChange(event: FCanvasChangeEvent): void {
    this.zoom.set(event.scale);
    this.panPos.set(event.position);
  }

  onNodePositionChange(nodeId: string, position: { x: number, y: number }): void {
    let updatedNode: FlowNode | undefined;
    this.nodes.update(nodes => 
      nodes.map(n => {
        if (n.id === nodeId) {
          updatedNode = { ...n, position };
          return updatedNode;
        }
        return n;
      })
    );
    this.saveStateToService();
    
    if (updatedNode) {
      this.workflowState.updateNodeInAPI(this.tabId(), updatedNode);
    }
  }

  onConnectionCreated(event: FCreateConnectionEvent): void {
    if (!event.targetId) return;
    
    const newConnection: FlowConnection = {
      id: `conn-${Date.now()}`,
      fromNode: event.sourceId.replace(/-out|-true|-false/, ''),
      toNode: event.targetId.replace('-in', ''),
      fromPort: event.sourceId,
      toPort: event.targetId
    };
    
    this.connections.update(conns => [...conns, newConnection]);
    this.saveStateToService();
    
  }

  onConnectionReassigned(event: FReassignConnectionEvent): void {
    if (!event.nextTargetId) return;
    
    this.connections.update(conns => 
      conns.map(c => 
        c.id === event.connectionId 
          ? { 
              ...c, 
              toNode: event.nextTargetId!.replace('-in', ''), 
              toPort: event.nextTargetId! 
            } 
          : c
      )
    );
    
  }

  deleteNode(nodeId: string): void {
    const node = this.nodes().find(n => n.id === nodeId);
    if (!node || node.type === 'Trigger') return;
    
    this.nodes.update(ns => ns.filter(n => n.id !== nodeId));
    this.connections.update(cs => cs.filter(c => c.fromNode !== nodeId && c.toNode !== nodeId));
    this.saveStateToService();
  }

  onDeleteSelected(event: any): void {
    const connIds = event.connectionIds || [];
    let nodeIds: string[] = event.nodeIds || [];
    
    // Prevent Trigger nodes from being deleted
    nodeIds = nodeIds.filter(id => {
      const node = this.nodes().find(n => n.id === id);
      return node && node.type !== 'Trigger';
    });
    
    if (connIds.length > 0) {
      this.connections.update(conns => conns.filter(c => !connIds.includes(c.id)));
    }
    
    if (nodeIds.length > 0) {
      this.nodes.update(nodes => nodes.filter(n => !nodeIds.includes(n.id)));
      this.connections.update(conns => conns.filter(c => !nodeIds.includes(c.fromNode) && !nodeIds.includes(c.toNode)));
    }
    
    if (connIds.length > 0 || nodeIds.length > 0) {
      this.saveStateToService();
    }
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
