import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { JsonPipe } from '@angular/common';
import { GridStack, GridStackNode } from 'gridstack';
import { ComponentList } from '../component-list/component-list';

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
          disableResize: true,
          removable:     false,
        },
        this.gridContainerRef().nativeElement,
      )!;
      this.grid = grid;

      // 'added' fires when an external widget is dropped onto the grid.
      grid.on('added', (_event: Event, nodes: GridStackNode[]) => {
        nodes.forEach((node) => {
          const type = node.el?.getAttribute('data-type') ?? 'unknown';
          const id   = `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

          // Replace the palette card content with a grid-placed widget label.
          const contentEl = node.el?.querySelector('.grid-stack-item-content');
          if (contentEl) {
            contentEl.innerHTML = `
              <div class="grid-item-content" data-type="${type}">
                <span class="grid-item-type">${type}</span>
                <!-- PHASE 2: replace innerHTML with ViewContainerRef.createComponent()
                     and pass the ComponentConfig (Detail Section popup/data-model)
                     to the dynamically loaded Angular component. -->
              </div>`;
          }

          // Re-enter Angular zone to update the layout signal.
          this.ngZone.run(() => {
            this.layout.update((prev) => [
              ...prev,
              { id, x: node.x ?? 0, y: node.y ?? 0, w: node.w ?? 2, h: node.h ?? 1, type },
            ]);
            console.log('[POC] layout:', this.layout());
          });
        });
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
