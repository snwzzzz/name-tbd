import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  signal,
  viewChild,
  ViewContainerRef,
  ComponentRef,
  inject,
} from '@angular/core';
import { JsonPipe } from '@angular/common';
import { GridStack, GridStackNode } from 'gridstack';
import { ComponentList } from '../component-list/component-list';
import { ButtonWidgetComponent } from '../widgets/button-widget/button-widget.component';
import { FormWidgetComponent } from '../widgets/form-widget/form-widget.component';
import { DefaultWidgetComponent } from '../widgets/default-widget/default-widget.component';

// ─── Artboard constants (16:9 website viewport reference) ─────────────────────
// 24 columns × 60px = 1440px wide
// 18 rows    × 45px = 810px tall  → 1440 × 810 = exactly 16:9
// One grid cell (1×1) = 60 × 45px
// Typical button (w:2, h:1) content = ~112 × 37px after 4px margins ✓
const AW = 1440;             // artboard width  (px)
const AH = 810;              // artboard height (px)  — AW * 9/16
const COLS = 24;             // grid columns
const ROWS = 18;             // grid rows  (fixed — locks canvas at 16:9)
const CELL_H = AH / ROWS;   // 45px per row

export interface LayoutItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Component type key ('button' | 'detail-section' | …).
   *  PHASE 2: widen to a full ComponentConfig carrying the Detail Section
   *  popup / data-model so the 'added' handler can pass it to createComponent(). */
  type: string;
  children?: LayoutItem[];
}

@Component({
  selector: 'app-poc',
  standalone: true,
  imports: [ComponentList, JsonPipe],
  templateUrl: './poc.html',
  styleUrl: './poc.scss',
})
export class Poc implements AfterViewInit, OnDestroy {
  // ─── View references ───────────────────────────────────────────────────────
  private gridContainerRef = viewChild.required<ElementRef<HTMLElement>>('gridContainer');
  private viewportRef      = viewChild.required<ElementRef<HTMLElement>>('viewport');

  private grid: GridStack | null = null;

  // ─── Layout state ──────────────────────────────────────────────────────────
  readonly layout = signal<LayoutItem[]>([]);

  private vcr = inject(ViewContainerRef);
  private widgetRefs = new Map<string, ComponentRef<any>>();

  // ─── Zoom / Pan state ──────────────────────────────────────────────────────
  readonly zoom  = signal(1);
  readonly panX  = signal(0);
  readonly panY  = signal(0);
  readonly isPanning = signal(false);

  /** CSS transform applied to the artboard element for panning only. */
  readonly artboardTransform = computed(
    () => `translate(${this.panX()}px, ${this.panY()}px)`
  );
  
  /** Zoom level rounded to a display percentage. */
  readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));

  // ─── Internal pan tracking (not reactive, no CD needed) ───────────────────
  private spaceHeld         = false;
  private middleMouseDown   = false;
  private activelyPanning   = false;
  private lastMouseX        = 0;
  private lastMouseY        = 0;

  // ─── Bound listener references (needed to remove them later) ──────────────
  private _onKeyDown!: (e: KeyboardEvent) => void;
  private _onKeyUp!:   (e: KeyboardEvent) => void;
  private _onMouseUp!: () => void;
  private _onWheel!:   (e: WheelEvent) => void;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    // ── Global keyboard listeners ──────────────────────────────────────────
    this._onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space') {
        // Ignore when an input/textarea is focused
        const tag = (document.activeElement as HTMLElement)?.tagName ?? '';
        if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
        e.preventDefault();
        this.spaceHeld = true;
        this.isPanning.set(true);
      }
      // Ctrl+0 = reset zoom, Ctrl++/= = zoom in, Ctrl+- = zoom out
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '0') { e.preventDefault(); this.zoomReset(); }
        if (e.key === '=' || e.key === '+') { e.preventDefault(); this.zoomIn(); }
        if (e.key === '-') { e.preventDefault(); this.zoomOut(); }
        if (e.key === 'f' || e.key === 'F') { e.preventDefault(); this.zoomFit(); }
      }
    };
    this._onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        this.spaceHeld = false;
        if (!this.middleMouseDown) this.isPanning.set(false);
      }
    };
    this._onMouseUp = () => {
      this.activelyPanning = false;
      this.middleMouseDown = false;
      if (!this.spaceHeld) this.isPanning.set(false);
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup',   this._onKeyUp);
    document.addEventListener('mouseup', this._onMouseUp);

    // ── Wheel listener (non-passive so we can call preventDefault) ─────────
    this._onWheel = (e: WheelEvent) => this.handleWheel(e);
    this.viewportRef().nativeElement.addEventListener('wheel', this._onWheel, { passive: false });

    // ── Fit artboard to viewport on load ──────────────────────────────────
    requestAnimationFrame(() => this.zoomFit());

    // ── GridStack initialisation (outside Angular zone) ───────────────────
    this.ngZone.runOutsideAngular(() => {
      const grid = GridStack.init(
        {
          column:     COLS,
          cellHeight: CELL_H,
          margin:     4,

          // Fixed row count — locks the canvas to exactly 16:9
          row: ROWS,

          // Disable responsive breakpoints so the grid doesn't drop to 1 column when zoomed out
          columnOpts: { breakpoints: [] },

          // Accept items dragged from ComponentList palette (our own selector avoids
          // adding .grid-stack-item to palette cards, which would break their layout).
          acceptWidgets: '.gs-drag-item',

          // 'float' mode: widgets stay exactly where dropped, no gravity packing.
          mode: 'float',

          // Use the content div as the drag handle (matches .grid-stack-item-content).
          draggable: { handle: '.grid-stack-item-content' },

          // PHASE 2: set disableResize:false + wire the 'change' event to sync layout().
          disableResize: false,
          removable:     false,
        },
        this.gridContainerRef().nativeElement,
      )!;
      this.grid = grid;
      
      const syncLayout = () => {
        this.ngZone.run(() => {
          const mapNode = (n: GridStackNode): LayoutItem => {
            // If this node is a container with a subGrid, recalculate its minimum bounds!
            if (n.subGrid && n.grid) {
              const baseMinW = parseInt(n.el?.getAttribute('data-base-min-w') || String(n.minW || 2));
              const baseMinH = parseInt(n.el?.getAttribute('data-base-min-h') || String(n.minH || 2));
              
              // Store original minW/minH if not already stored, so we know the container's absolute minimum empty size
              if (!n.el?.hasAttribute('data-base-min-w')) {
                n.el?.setAttribute('data-base-min-w', String(baseMinW));
                n.el?.setAttribute('data-base-min-h', String(baseMinH));
              }

              // Calculate the physical bounding box of all children currently inside the container
              let maxRightEdge = baseMinW;
              let maxBottomEdge = baseMinH;
              
              n.subGrid.engine.nodes.forEach(child => {
                const rightEdge = (child.x ?? 0) + (child.w || 1);
                const bottomEdge = (child.y ?? 0) + (child.h || 1);
                
                if (rightEdge > maxRightEdge) maxRightEdge = rightEdge;
                if (bottomEdge > maxBottomEdge) maxBottomEdge = bottomEdge;
              });

              // Instantly update the GridStack engine so the user cannot resize the container below its content's bounding box
              if (n.minW !== maxRightEdge || n.minH !== maxBottomEdge) {
                n.grid.update(n.el!, { minW: maxRightEdge, minH: maxBottomEdge });
              }
            }

            return {
              id: n.id as string || n.el?.getAttribute('data-gs-id') || `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              x: n.x ?? 0,
              y: n.y ?? 0,
              w: n.w ?? 2,
              h: n.h ?? 1,
              type: n.el?.getAttribute('data-type') || 'unknown',
              children: n.subGrid ? n.subGrid.engine.nodes.map(mapNode) : undefined,
            };
          };
          
          if (this.grid) {
            const newLayout = this.grid.engine.nodes.map(mapNode);
            this.layout.set(newLayout);
            console.log('[POC] layout:', newLayout);
          }
        });
      };
      


      // 'added' fires when an external widget is dropped onto the grid (or subgrid).
      grid.on('added', (_event: Event, nodes: GridStackNode[]) => {
        nodes.forEach((node) => {
          const type = node.el?.getAttribute('data-type') ?? 'unknown';
          const id   = `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          
          if (node.el) {
             node.el.setAttribute('data-gs-id', id);
             node.id = id;
          }

          // Replace the palette card content with a grid-placed widget label.
          const contentEl = node.el?.querySelector('.grid-stack-item-content');
          if (contentEl) {
            // Remove the palette-card class that was cloned from the sidebar 
            // so we don't carry over the 9px 12px padding!
            contentEl.classList.remove('palette-card');
            
            switch (type) {
              case 'container':
                // Convert this widget into a nested GridStack (it natively enforces containment bounds)
                contentEl.innerHTML = '';
                // GridStack 14 natively tracks resize to recompute 'auto' columns if subGridOpts uses it
                grid.makeSubGrid(node.el as any, {
                  column: 'auto',
                  row: node.h ?? 1,
                  maxRow: node.h ?? 1,
                  cellHeight: CELL_H, // inherit exact row height from parent scale
                  margin: 0, // 0 margin so children sit flush inside this structural component
                  acceptWidgets: '.gs-drag-item',
                  disableResize: false,
                  removable: false,
                  mode: 'float',
                }, undefined, false); // pass saveContent = false to avoid auto-creating a child widget
                contentEl.classList.add('container-widget');
                break;

              case 'form': {
                contentEl.innerHTML = '';
                const compRef = this.vcr.createComponent(FormWidgetComponent);
                compRef.changeDetectorRef.detectChanges();
                contentEl.appendChild(compRef.location.nativeElement);
                this.widgetRefs.set(id, compRef);
                break;
              }

              case 'button': {
                contentEl.innerHTML = '';
                const compRef = this.vcr.createComponent(ButtonWidgetComponent);
                compRef.instance.label = 'Angular Button Component';
                
                // We need to manually trigger change detection for the dynamic component
                compRef.changeDetectorRef.detectChanges();
                
                contentEl.appendChild(compRef.location.nativeElement);
                this.widgetRefs.set(id, compRef);
                break;
              }

              default: {
                contentEl.innerHTML = '';
                const compRef = this.vcr.createComponent(DefaultWidgetComponent);
                compRef.instance.type = type;
                compRef.changeDetectorRef.detectChanges();
                contentEl.appendChild(compRef.location.nativeElement);
                this.widgetRefs.set(id, compRef);
                break;
              }
            }
          }

        });

        // Pass 2: Ensure any subgrid we just dropped into is large enough to hold its new children
        nodes.forEach((node) => {
          if (node.grid && node.grid !== grid) {
            const parentNode = node.grid.parentGridNode;
            if (parentNode && parentNode.grid) {
              // Read original intended constraints from the DOM element (since GridStack might have clamped node.w during drop)
              const origW = parseInt(node.el?.getAttribute('gs-w') || String(node.w || 1));
              const origMinW = parseInt(node.el?.getAttribute('gs-min-w') || String(node.minW || origW));
              const origH = parseInt(node.el?.getAttribute('gs-h') || String(node.h || 1));
              const origMinH = parseInt(node.el?.getAttribute('gs-min-h') || String(node.minH || origH));
              
              // Calculate required dimensions based on where the widget was placed (node.x, node.y)
              // This accounts for multiple widgets side-by-side or stacked!
              const requiredW = Math.max(parentNode.w || 1, (node.x ?? 0) + Math.max(origW, origMinW));
              const requiredH = Math.max(parentNode.h || 1, (node.y ?? 0) + Math.max(origH, origMinH));
              
              if (requiredW > (parentNode.w || 1) || requiredH > (parentNode.h || 1)) {
                // Resize parent container to fully fit the layout bounds
                parentNode.grid.update(parentNode.el!, { w: requiredW, h: requiredH });
                
                // Keep subgrid constraints in sync with the new physical height
                if (parentNode.subGrid) {
                  parentNode.subGrid.opts.maxRow = requiredH;
                  parentNode.subGrid.opts.row = requiredH;
                  if (parentNode.subGrid.engine) {
                    parentNode.subGrid.engine.maxRow = requiredH;
                  }
                }
                
                // Now that the parent is bigger, restore the child's true dimensions
                node.grid.update(node.el!, { w: origW, minW: origMinW, h: origH, minH: origMinH });
              }
            }
          }
        });

        syncLayout();
      });

      // Cleanup Angular components and nested GridStack instances when widgets are removed
      grid.on('removed', (_event: Event, nodes: GridStackNode[]) => {
        nodes.forEach(node => {
          const id = node.id as string || node.el?.getAttribute('data-gs-id');
          if (id && this.widgetRefs.has(id)) {
            this.widgetRefs.get(id)!.destroy();
            this.widgetRefs.delete(id);
          }
          if (node.subGrid) {
            node.subGrid.destroy(false); // remove instances/listeners recursively
          }
        });
        syncLayout();
      });

      grid.on('change', () => syncLayout());

      // On resize stop, we might need to syncLayout (which captures the new sizes)
      // and update the nested grid maxRow constraint to match the container's new row height
      grid.on('resizestop', (_event: Event, el: any) => {
        const node = el.gridstackNode as GridStackNode;
        if (node && node.subGrid) {
          node.subGrid.opts.maxRow = node.h ?? 1;
          node.subGrid.opts.row = node.h ?? 1;
          if (node.subGrid.engine) {
            node.subGrid.engine.maxRow = node.h ?? 1;
          }
        }
        syncLayout();
      });

    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup',   this._onKeyUp);
    document.removeEventListener('mouseup', this._onMouseUp);
    this.viewportRef().nativeElement.removeEventListener('wheel', this._onWheel);
    this.grid?.destroy(false);
    this.grid = null;
  }

  // ─── Zoom helpers ──────────────────────────────────────────────────────────

  zoomIn(): void  { this._clampZoom(this.zoom() * 1.25); }
  zoomOut(): void { this._clampZoom(this.zoom() / 1.25); }
  zoomReset(): void { this._clampZoom(1); }

  zoomFit(): void {
    const vp = this.viewportRef().nativeElement;
    const padding = 56;
    const fit = Math.min(
      (vp.clientWidth  - padding * 2) / AW,
      (vp.clientHeight - padding * 2) / AH,
    );
    this.zoom.set(Math.max(0.05, fit));
    this.panX.set(0);
    this.panY.set(0);
  }

  private _clampZoom(z: number): void {
    const newZoom = Math.max(0.05, Math.min(4, z));
    this.zoom.set(newZoom);
  }

  // ─── Viewport event handlers ───────────────────────────────────────────────

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();

    const vp   = this.viewportRef().nativeElement;
    const rect = vp.getBoundingClientRect();
    // Cursor position relative to viewport center (the artboard's anchor)
    const mx = e.clientX - rect.left - rect.width  / 2;
    const my = e.clientY - rect.top  - rect.height / 2;

    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Scroll → zoom toward cursor
      const factor   = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const oldZoom  = this.zoom();
      const newZoom  = Math.max(0.05, Math.min(4, oldZoom * factor));
      const ratio    = newZoom / oldZoom;

      this.panX.update((x) => mx + (x - mx) * ratio);
      this.panY.update((y) => my + (y - my) * ratio);
      this.zoom.set(newZoom);
    } else if (e.shiftKey) {
      // Shift+Scroll → horizontal pan
      this.panX.update((x) => x - e.deltaY);
    } else {
      // Plain scroll → vertical / trackpad pan
      this.panX.update((x) => x - e.deltaX);
      this.panY.update((y) => y - e.deltaY);
    }
  }

  onViewportMouseDown(e: MouseEvent): void {
    if (e.button === 1) {
      // Middle mouse → pan
      e.preventDefault();
      this.middleMouseDown = true;
      this.activelyPanning = true;
      this.isPanning.set(true);
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else if (e.button === 0 && this.spaceHeld) {
      // Space + left drag → pan
      e.preventDefault();
      this.activelyPanning = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  }

  onViewportMouseMove(e: MouseEvent): void {
    if (!this.activelyPanning) return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.panX.update((x) => x + dx);
    this.panY.update((y) => y + dy);
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }
}
