import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  signal,
  effect,
  viewChild,
  ViewContainerRef,
  ComponentRef,
  inject,
  Type,
  HostListener
} from '@angular/core';
import { JsonPipe } from '@angular/common';
import { GridStack, GridStackNode } from 'gridstack';
import { ButtonWidgetComponent } from '../widgets/button-widget/button-widget.component';
import { FormWidgetComponent } from '../widgets/form-widget/form-widget.component';
import { DefaultWidgetComponent } from '../widgets/default-widget/default-widget.component';
import { CdkMenuModule } from '@angular/cdk/menu';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { WorkflowStateService } from '../services/workflow-state.service';
import { TabsService } from '../services/tabs.service';
import { FormsModule } from '@angular/forms';

export const WIDGET_REGISTRY: Record<string, Type<any>> = {
  'button': ButtonWidgetComponent,
  'form': FormWidgetComponent,
};

// ─── Artboard constants (16:9 website viewport reference) ─────────────────────
// 24 columns × 60px = 1440px wide
// 18 rows    × 45px = 810px tall  → 1440 × 810 = exactly 16:9
// One grid cell (1×1) = 60 × 45px
// Typical button (w:2, h:1) content = ~112 × 37px after 4px margins ✓
import { LayoutItem, LayoutStateService } from '../services/layout-state.service';

const AW = 1440;             // artboard width  (px)
const AH = 810;              // artboard height (px)  — AW * 9/16
const COLS = 24;             // grid columns
const ROWS = 18;             // grid rows  (fixed — locks canvas at 16:9)
const CELL_H = AH / ROWS;   // 45px per row



@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CdkMenuModule, DialogModule, FormsModule],
  templateUrl: './canvas.html',
  styleUrl: './canvas.scss',
})
export class Canvas implements AfterViewInit, OnDestroy {
  // ─── View references ───────────────────────────────────────────────────────
  private gridContainerRef = viewChild.required<ElementRef<HTMLElement>>('gridContainer');
  private viewportRef      = viewChild.required<ElementRef<HTMLElement>>('viewport');

  private grid: GridStack | null = null;

  // ─── Layout state ──────────────────────────────────────────────────────────
  readonly layout = signal<LayoutItem[]>([]);

  private vcr = inject(ViewContainerRef);
  private widgetRefs = new Map<string, ComponentRef<any>>();
  dialog = inject(Dialog);
  private workflowState = inject(WorkflowStateService);
  private tabsService = inject(TabsService);
  private layoutStateService = inject(LayoutStateService);

  // ─── Zoom / Pan state ──────────────────────────────────────────────────────
  readonly zoom  = signal(1);
  readonly panX  = signal(0);
  readonly panY  = signal(0);
  readonly isPanning = signal(false);

  readonly contextMenuState = signal<{ x: number, y: number, item: any } | null>(null);

  @HostListener('document:pointerdown', ['$event'])
  @HostListener('document:contextmenu')
  onDocumentInteraction(e?: MouseEvent) {
    if (e && e.type === 'contextmenu') {
      this.contextMenuState.set(null);
      return;
    }
    this.contextMenuState.set(null);
    if (e && e.type === 'pointerdown') {
      const target = e.target as HTMLElement;
      // Find closest grid-stack-item
      const item = target ? target.closest('.grid-stack-item') : null;
      
      // Remove selected from all others
      document.querySelectorAll('.grid-stack-item.selected').forEach(el => {
        if (el !== item) el.classList.remove('selected');
      });
      
      // Add selected to current
      if (item) {
        item.classList.add('selected');
      }
    }
  }

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

  private isRestoring = false;
  private gridReady = signal(false);
  private lastKnownState = new Map<string, {x: number, y: number, w: number, h: number, parentId: string | number | undefined}>();

  constructor(private ngZone: NgZone) {
    effect(() => {
      const tabId = this.tabsService.activeTabId();
      const ready = this.gridReady();
      if (tabId && ready && this.grid) {
        this.layoutStateService.loadLayoutForTab(tabId).subscribe((savedLayout: LayoutItem[]) => {
          this.ngZone.runOutsideAngular(() => {
            this.isRestoring = true;
            this.grid!.removeAll();
            
            const loadNodes = (items: LayoutItem[], parentGrid: GridStack) => {
            items.forEach(item => {
               const div = document.createElement('div');
               div.className = 'grid-stack-item';
               div.setAttribute('data-type', item.type || 'unknown');
               if (item.id) div.setAttribute('data-gs-id', item.id.toString());
               
               const content = document.createElement('div');
               content.className = 'grid-stack-item-content';
               div.appendChild(content);
               
               const isResizable = item.type === 'button' || item.type === 'container';
               this.addRemoveButton(div, parentGrid as GridStack);
               const widgetNode = (parentGrid as any).addWidget({ 
                 el: div, 
                 id: item.id, 
                 x: item.x, 
                 y: item.y, 
                 w: item.w, 
                 h: item.h,
                 noResize: !isResizable
               });
               if (item.type === 'container') {
                 content.classList.add('container-widget');
                 (parentGrid as any).makeSubGrid(div, {
                   column: 'auto',
                   row: item.h ?? 1,
                   maxRow: item.h ?? 1,
                   cellHeight: 45, // CELL_H from outer scope
                   margin: 0,
                   acceptWidgets: '.gs-drag-item, .grid-stack-item',
                   disableResize: false,
                   removable: false,
                   mode: 'float',
                 }, undefined, false);
               }
               const node = widgetNode?.gridstackNode;
               if (item.children && item.children.length > 0 && node && node.subGrid) {
                 loadNodes(item.children, node.subGrid as GridStack);
               }
            });
          };
          
          const populateLastKnown = (items: LayoutItem[]) => {
              items.forEach(item => {
                if (item.id) this.lastKnownState.set(item.id.toString(), {x: item.x || 0, y: item.y || 0, w: item.w || 100, h: item.h || 40, parentId: item.parentId});
                if (item.children) populateLastKnown(item.children);
              });
            };
            populateLastKnown(savedLayout);
            if (savedLayout.length > 0) {
              loadNodes(savedLayout, this.grid!);
            }
            this.isRestoring = false;
          });
        });
      }
    });
  }

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
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = (document.activeElement as HTMLElement)?.tagName ?? '';
        if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
        
        const selectedItems = document.querySelectorAll('.grid-stack-item.selected');
        if (selectedItems.length > 0) {
          const deepest = selectedItems[selectedItems.length - 1];
          const node = (deepest as any).gridstackNode;
          if (node && node.grid) {
             node.grid.removeWidget(deepest as HTMLElement, true, true);
             let delId: any = node.id || deepest.getAttribute('data-gs-id');
             if (delId && !isNaN(Number(delId))) delId = Number(delId);
             if (delId) this.layoutStateService.deleteComponent(delId).subscribe();
          }
        }
      }
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
          acceptWidgets: '.gs-drag-item, .grid-stack-item',

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
          const mapNode = (n: GridStackNode, parentId?: string): LayoutItem => {
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
              id: (() => {
                const rawId = n.id || n.el?.getAttribute('data-gs-id');
                if (rawId && !isNaN(Number(rawId))) return Number(rawId);
                return rawId || `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
              })() as any,
              x: n.x ?? 0,
              y: n.y ?? 0,
              w: n.w ?? 2,
              h: n.h ?? 1,
              type: n.el?.getAttribute('data-type') || 'unknown',
              parentId: parentId ? (!isNaN(Number(parentId)) ? Number(parentId) : parentId) : undefined,
              children: n.subGrid ? n.subGrid.engine.nodes.map(child => mapNode(child, n.id as string || n.el?.getAttribute('data-gs-id') as string)) : undefined,
            };
          };
          
          if (this.grid) {
            const newLayout = this.grid.engine.nodes.map(n => mapNode(n, undefined));
            
            if (!this.isRestoring) {
              const tabId = this.tabsService.activeTabId();
              if (tabId) {
                // Flatten new layout to diff
                const checkDiff = (items: LayoutItem[]) => {
                  items.forEach(item => {
                    if (item.id && !isNaN(Number(item.id))) {
                      const idStr = item.id.toString();
                      const last = this.lastKnownState.get(idStr);
                      // Compare to last known state
                      if (!last || last.x !== item.x || last.y !== item.y || last.w !== item.w || last.h !== item.h || last.parentId !== item.parentId) {
                        // Changed! Update backend.
                        this.layoutStateService.updateComponent(tabId, item).subscribe();
                        this.lastKnownState.set(idStr, {x: item.x || 0, y: item.y || 0, w: item.w || 100, h: item.h || 40, parentId: item.parentId});
                      }
                    }
                    if (item.children) checkDiff(item.children);
                  });
                };
                checkDiff(newLayout);
              }
            }
            this.layout.set(newLayout);
            if (this.isRestoring) return;
            const tabId = this.tabsService.activeTabId();
            if (tabId) {
              this.layoutStateService.saveLayout(tabId, newLayout);
            }
            console.log('[CANVAS] layout:', newLayout);
          }
        });
      };
      


      // 'added' fires when an external widget is dropped onto the grid (or subgrid).
      grid.on('added', (_event: Event, nodes: GridStackNode[]) => {
        const tabId = this.tabsService.activeTabId();
        nodes.forEach((node) => {
          const type = node.el?.getAttribute('data-type') ?? 'unknown';
          const id = node.el?.getAttribute('data-gs-id') || node.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          
          if (node.el) {
              if (node.grid) this.addRemoveButton(node.el, node.grid as GridStack);
             node.el.setAttribute('data-gs-id', id as string);
             node.id = id;
          }

          // Replace the palette card content with a grid-placed widget label.
          const contentEl = node.el?.querySelector('.grid-stack-item-content');
          if (contentEl) {
            // Remove the palette-card class that was cloned from the sidebar 
            // so we don't carry over the 9px 12px padding!
            contentEl.classList.remove('palette-card');
            
            if (type === 'container') {
              // Convert this widget into a nested GridStack (it natively enforces containment bounds)
              contentEl.innerHTML = '';
              // GridStack 14 natively tracks resize to recompute 'auto' columns if subGridOpts uses it
              grid.makeSubGrid(node.el as any, {
                column: 'auto',
                row: node.h ?? 1,
                maxRow: node.h ?? 1,
                cellHeight: CELL_H, // inherit exact row height from parent scale
                margin: 0, // 0 margin so children sit flush inside this structural component
                acceptWidgets: '.gs-drag-item, .grid-stack-item',
                disableResize: false,
                removable: false,
                mode: 'float',
              }, undefined, false); // pass saveContent = false to avoid auto-creating a child widget
              contentEl.classList.add('container-widget');
            } else {
              contentEl.innerHTML = '';
              const componentClass = WIDGET_REGISTRY[type] || DefaultWidgetComponent;
              const compRef = this.vcr.createComponent(componentClass);
              
              // Only pass type to the DefaultWidgetComponent so it can render the placeholder name
              if (componentClass === DefaultWidgetComponent) {
                compRef.setInput('type', type);
              }
              
              compRef.changeDetectorRef.detectChanges();
              contentEl.appendChild(compRef.location.nativeElement);
              this.widgetRefs.set(id, compRef);
              
              // Add right-click listener
              contentEl.addEventListener('contextmenu', (e: Event) => {
                const me = e as MouseEvent;
                me.preventDefault();
                me.stopPropagation();
                
                const currentItem = this.layout().find(i => i.id?.toString() === id.toString()) || { id, type };
                this.contextMenuState.set({ x: me.clientX, y: me.clientY, item: currentItem });
              });
            }
          }

          if (!this.isRestoring && tabId) {
            const parentNode = node.grid?.parentGridNode;
            let parentId: any = parentNode ? (parentNode.id || parentNode.el?.getAttribute('data-gs-id')) : undefined;
            if (parentId && !isNaN(Number(parentId))) parentId = Number(parentId);

            if (!node.id || isNaN(Number(node.id))) {
              this.layoutStateService.addComponent(tabId, {
              id: (node.id || node.el?.getAttribute('data-gs-id')) as string,
              type: node.el?.getAttribute('data-type') || 'unknown',
              x: node.x || 0,
              y: node.y || 0,
              w: node.w || 100,
              h: node.h || 40,
              parentId: parentId
            }).subscribe(dto => {
              if (dto && dto.id) {
                const oldId = (node.id || node.el?.getAttribute('data-gs-id')) as string;
                const newId = dto.id.toString();

                // Find the actual node currently in the grid engine, in case GridStack cloned/replaced it after drop
                let actualNode = node;
                if (node.grid) {
                  const found = node.grid.engine.nodes.find(n => n.id === oldId || n.el?.getAttribute('data-gs-id') === oldId);
                  if (found) actualNode = found;
                }

                // 1. Update DOM attributes to match DB entity
                if (actualNode.el) {
                  actualNode.el.setAttribute('data-gs-id', newId);
                  if (dto.type) actualNode.el.setAttribute('data-type', dto.type);
                }
                actualNode.id = newId;

                // 2. Migrate widgetRefs from temp ID -> DB ID
                if (oldId && oldId !== newId && this.widgetRefs.has(oldId)) {
                  const ref = this.widgetRefs.get(oldId)!;
                  this.widgetRefs.delete(oldId);
                  this.widgetRefs.set(newId, ref);
                }

                // 3. Seed lastKnownState so future move/resize diffs can track this element
                this.lastKnownState.set(newId, {
                  x: actualNode.x ?? dto.x ?? 0,
                  y: actualNode.y ?? dto.y ?? 0,
                  w: actualNode.w ?? dto.w ?? 100,
                  h: actualNode.h ?? dto.h ?? 40,
                  parentId: dto.parentId ?? undefined,
                });

                // 4. Re-sync layout signal so it picks up the real DB ID
                syncLayout();

                // 5. If the user resized/moved the item before the DB save completed, sync it now
                if (actualNode.w !== dto.w || actualNode.h !== dto.h || actualNode.x !== dto.x || actualNode.y !== dto.y) {
                  this.layoutStateService.updateComponent(tabId, {
                    id: dto.id,
                    type: dto.type || 'unknown',
                    x: actualNode.x || 0,
                    y: actualNode.y || 0,
                    w: actualNode.w || 100,
                    h: actualNode.h || 40,
                    parentId: dto.parentId || undefined
                  } as any).subscribe();
                }
              }
            });
            } else {
              this.layoutStateService.updateComponent(tabId, {
                id: Number(node.id),
                type: node.el?.getAttribute('data-type') || 'unknown',
                x: node.x || 0,
                y: node.y || 0,
                w: node.w || 100,
                h: node.h || 40,
                parentId: parentId || undefined
              } as any).subscribe();
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
          let id: any = node.id || node.el?.getAttribute('data-gs-id');
            if (id && !isNaN(Number(id))) id = Number(id);
          
          
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

      grid.on('change', (_event: Event, nodes: GridStackNode[]) => {
        if (this.isRestoring) return;
        const tabId = this.tabsService.activeTabId();
        if (tabId) {
          nodes?.forEach(node => {
            let id: any = node.id || node.el?.getAttribute('data-gs-id');
            if (id && !isNaN(Number(id))) id = Number(id);
            const type = node.el?.getAttribute('data-type') || 'unknown';
            if (id) {
              const parentNode = node.grid?.parentGridNode;
              let parentId: any = parentNode ? (parentNode.id || parentNode.el?.getAttribute('data-gs-id')) : undefined;
              if (parentId && !isNaN(Number(parentId))) parentId = Number(parentId);
              // Update handled by syncLayout diff logic now
            }
          });
        }
        syncLayout();
      });

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
      this.ngZone.run(() => this.gridReady.set(true));
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

  // ─── Logic Flow ────────────────────────────────────────────────────────
  
  private addRemoveButton(div: HTMLElement, gridInstance: GridStack) {
    if (div.querySelector('.widget-remove-btn')) return;
    const btn = document.createElement('div');
    btn.className = 'widget-remove-btn';
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    btn.title = 'Remove';
    btn.onclick = (e) => {
      e.stopPropagation();
      gridInstance.removeWidget(div, true, true);
      let delId: any = div.getAttribute('data-gs-id');
      if (delId && !isNaN(Number(delId))) delId = Number(delId);
      if (delId) this.layoutStateService.deleteComponent(delId).subscribe();
    };
    div.appendChild(btn);
  }

  addLogicToItem(item: LayoutItem): void {
    const tabId = this.tabsService.activeTabId();
    if (tabId) {
      this.workflowState.addTriggerForElement(tabId, item.id?.toString() || '', 'element_click');
      this.tabsService.setMode('workflow');
    }
    this.contextMenuState.set(null);
  }
}
