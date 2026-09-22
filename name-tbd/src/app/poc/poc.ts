import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { JsonPipe } from '@angular/common';
import { GridStack, GridStackNode } from 'gridstack';
import { ComponentList } from '../component-list/component-list';

/** A serialisable representation of one grid item — extend later with a full component config. */
export interface LayoutItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The component type key, e.g. 'button' | 'detail-section'.
   *  PHASE 2: replace/extend with a full ComponentConfig object
   *  that carries the popup / data-model fields from the Detail Section design. */
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
  // Signal-based ViewChild (Angular 17+ API)
  private gridContainerRef = viewChild.required<ElementRef<HTMLElement>>('gridContainer');

  private grid: GridStack | null = null;

  /** Serialisable layout state — bind to a JSON display or persist later. */
  readonly layout = signal<LayoutItem[]>([]);

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    // Run GridStack initialisation outside Angular's zone so that its internal
    // DOM mutations (which happen outside Angular's rendering cycle) don't
    // trigger spurious change-detection cycles.
    this.ngZone.runOutsideAngular(() => {
      const grid = GridStack.init(
        {
          // Grid configuration
          column: 12,
          cellHeight: 80,
          margin: 8,

          // Accept items dragged from the ComponentList palette.
          // '.gs-drag-item' is our own selector — avoids needing .grid-stack-item
          // on the palette cards, which would conflict with GridStack's own positioning CSS.
          acceptWidgets: '.gs-drag-item',

          // Always show at least 4 rows so there is a visible droppable surface
          minRow: 4,

          // 'float' mode: widgets stay where dropped, no gravity-pack to top
          mode: 'float',

          // Override the drag handle so the whole item surface is draggable
          // (default is '.grid-stack-item-content' which our palette items don't use)
          draggable: { handle: '.grid-stack-item-content' },

          // Keep POC minimal — no resize handles for now
          // PHASE 2: remove disableResize + wire up 'change' event to keep layout() in sync
          disableResize: true,
          removable: false,
        },
        this.gridContainerRef().nativeElement,
      )!;
      this.grid = grid;

      // 'added' fires when an external widget is dropped onto the grid.
      grid.on('added', (_event: Event, nodes: GridStackNode[]) => {
        nodes.forEach((node) => {
          // Read the data-type attribute set on the draggable source element.
          const type = node.el?.getAttribute('data-type') ?? 'unknown';
          const id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

          // Inject a visible label into the widget's content area.
          const contentEl = node.el?.querySelector('.grid-stack-item-content');
          if (contentEl) {
            contentEl.innerHTML = `
              <div class="grid-item-content">
                <span class="grid-item-label">${type}</span>
                <!-- PHASE 2: dynamically load the real Angular component for this type,
                     using ViewContainerRef + createComponent(), passing the config from
                     the Detail Section popup/data-model. -->
              </div>`;
          }

          // Re-enter Angular's zone to update signals / trigger CD.
          this.ngZone.run(() => {
            const item: LayoutItem = {
              id,
              x: node.x ?? 0,
              y: node.y ?? 0,
              w: node.w ?? 2,
              h: node.h ?? 1,
              type,
            };

            this.layout.update((prev) => [...prev, item]);
            console.log('[POC] Layout updated:', this.layout());
          });
        });
      });
    });
  }

  ngOnDestroy(): void {
    // destroy(false) removes GridStack internals but leaves the DOM intact,
    // so Angular's own cleanup can handle the elements safely.
    this.grid?.destroy(false);
    this.grid = null;
  }
}
