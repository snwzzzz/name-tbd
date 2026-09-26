import { Component, computed, signal, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { 
  FFlowModule, 
  FCanvasComponent, 
  FCreateConnectionEvent, 
  FReassignConnectionEvent,
  FCanvasChangeEvent
} from '@foblex/flow';

export interface FlowNode {
  id: string;
  position: { x: number; y: number };
  type: string;
}

export interface FlowConnection {
  id: string;
  fromNode: string;
  toNode: string;
  fromPort?: string;
  toPort?: string;
}

@Component({
  selector: 'app-workflow-editor',
  standalone: true,
  imports: [JsonPipe, FFlowModule],
  templateUrl: './workflow-editor.html',
  styleUrl: './workflow-editor.scss'
})
export class WorkflowEditor implements AfterViewInit {
  @ViewChild(FCanvasComponent) fCanvas!: FCanvasComponent;

  // ─── State ───────────────────────────────────────────────────────────────
  readonly nodes = signal<FlowNode[]>([
    { id: 'node-1', position: { x: 200, y: 150 }, type: 'Trigger' },
    { id: 'node-2', position: { x: 500, y: 150 }, type: 'Action' },
    { id: 'node-3', position: { x: 800, y: 150 }, type: 'Condition' }
  ]);
  
  readonly connections = signal<FlowConnection[]>([
    { id: 'conn-1', fromNode: 'node-1', toNode: 'node-2', fromPort: 'node-1-out', toPort: 'node-2-in' },
    { id: 'conn-2', fromNode: 'node-2', toNode: 'node-3', fromPort: 'node-2-out', toPort: 'node-3-in' }
  ]);

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

    this.nodes.update(ns => [...ns, {
      id: `node-${Date.now()}`,
      position: { x: centerX, y: centerY },
      type
    }]);
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
    this.nodes.update(nodes => 
      nodes.map(n => n.id === nodeId ? { ...n, position } : n)
    );
  }

  onConnectionCreated(event: FCreateConnectionEvent): void {
    if (!event.targetId) return;
    
    const newConnection: FlowConnection = {
      id: `conn-${Date.now()}`,
      fromNode: event.sourceId.replace('-out', ''),
      toNode: event.targetId.replace('-in', ''),
      fromPort: event.sourceId,
      toPort: event.targetId
    };
    
    this.connections.update(conns => [...conns, newConnection]);
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

  onDeleteSelected(event: any): void {
    const connIds = event.connectionIds || [];
    const nodeIds = event.nodeIds || [];
    
    if (connIds.length > 0) {
      this.connections.update(conns => conns.filter(c => !connIds.includes(c.id)));
    }
    
    if (nodeIds.length > 0) {
      this.nodes.update(nodes => nodes.filter(n => !nodeIds.includes(n.id)));
      // Also remove connections that reference these nodes
      this.connections.update(conns => conns.filter(c => !nodeIds.includes(c.fromNode) && !nodeIds.includes(c.toNode)));
    }
  }

  // ─── Zoom Controls ───────────────────────────────────────────────────────
  zoomIn(): void {
    this._clampZoom(this.zoom() * 1.25);
  }

  zoomOut(): void {
    this._clampZoom(this.zoom() / 1.25);
  }

  zoomReset(): void {
    this._clampZoom(1);
  }

  zoomFit(): void {
    this.zoomReset();
    this.panPos.set({ x: 0, y: 0 });
  }

  private _clampZoom(z: number): void {
    const newZoom = Math.max(0.05, Math.min(4, z));
    this.zoom.set(newZoom);
    if (this.fCanvas) {
      this.fCanvas.setScale(newZoom, this.fCanvas.getPosition());
    }
  }
}
