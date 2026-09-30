import {
  AfterViewInit, Component, ComponentRef, DestroyRef, ElementRef, HostListener, ViewContainerRef,
  computed, effect, inject, signal, untracked, viewChild,
} from '@angular/core';
import { GridItemHTMLElement, GridStack, GridStackNode } from 'gridstack';
import { LucideZap } from '@lucide/angular';
import { LayoutStateService } from '../../_services/layout-state.service';
import { SelectionService } from '../../_services/selection.service';
import { TabsService } from '../../_services/tabs.service';
import { WidgetRegistryService } from '../../_services/widget-registry.service';
import { WorkflowRuntimeService } from '../../_services/workflow-runtime.service';
import { PreviewSessionService } from '../../_services/preview-session.service';
import { WorkflowStateService } from '../../_services/workflow-state.service';
import { ViewportCommand, ViewportControls, ZoomAtEvent } from '../../_directives/viewport-controls.directive';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { ContextMenu } from '../../components/context-menu/context-menu';
import { ContextMenuItem } from '../../components/context-menu/context-menu-item';
import { ZoomControls } from '../../components/zoom-controls/zoom-controls';
import { ZoomButton } from '../../components/zoom-controls/zoom-button';
import { DEFAULT_WIDGET_TYPE, widgetDefinition } from '../../_constants/widget-registry.constants';
import {
  ARTBOARD_HEIGHT, ARTBOARD_WIDTH, CANVAS_FIT_PADDING, CANVAS_MAX_ZOOM, CANVAS_MIN_ZOOM, ROOT_GRID_OPTIONS,
  subGridOptions,
} from '../../_constants/artboard.constants';
import { CLICK_EVENT } from '../../_constants/workflow.constants';
import { CanvasContextMenu } from '../../_types/canvas.types';
import { ComponentId, GridGeometry, LayoutItem, WidgetProps } from '../../_types/layout.types';
import { UiComponentDto } from '../../api/models';
import { Point } from '../../_types/viewport.types';
import { isSavedId, newTemporaryId, toComponentId } from '../../_utils/component-id.utils';
import {
  addStoredWidget, createRemoveButton, fitContainersToContent, geometryOf, growContainerForDrop, nodeId,
  parentIdOf, sameGeometry, syncSubGridRows, toLayoutItems, widgetType,
} from '../../_utils/grid.utils';
import { clamp, zoomAround } from '../../_utils/viewport.utils';
import { flattenTree } from '../../_utils/layout-tree.utils';

const BUTTON_ZOOM_STEP = 1.25;

const isTyping = () => /INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement | null)?.tagName ?? '');

/**
 * The page editor: a 16:9 artboard with a GridStack grid (containers get nested grids).
 * Widgets are Angular components mounted into the grid items; GridStack owns the layout,
 * and every move/resize/drop is persisted. In preview, clicking buttons runs the workflow.
 */
@Component({
  selector: 'app-canvas',
  imports: [ViewportControls, ZoomControls, ZoomButton, ContextMenu, ContextMenuItem],
  templateUrl: './canvas.html',
  styleUrl: './canvas.scss',
})
export class Canvas implements AfterViewInit {
  private readonly tabs = inject(TabsService);
  private readonly layoutState = inject(LayoutStateService);
  private readonly selection = inject(SelectionService);
  private readonly widgetRegistry = inject(WidgetRegistryService);
  private readonly workflowState = inject(WorkflowStateService);
  private readonly workflowRuntime = inject(WorkflowRuntimeService);
  private readonly previewSession = inject(PreviewSessionService);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly gridContainer = viewChild.required<ElementRef<HTMLElement>>('gridContainer');
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');

  private grid: GridStack | null = null;
  private readonly gridReady = signal(false);
  /** True while a saved layout is being put into the grid (its events must not be persisted). */
  private restoring = false;
  /** Live widget components by component id. */
  private readonly widgetRefs = new Map<string, ComponentRef<BaseWidget>>();
  /** The last persisted geometry of each saved widget, to only send what changed. */
  private readonly savedGeometry = new Map<string, GridGeometry>();

  // ─── Zoom / pan (the artboard is centered; pan moves it from there) ──────
  readonly zoom = signal(1);
  readonly pan = signal<Point>({ x: 0, y: 0 });
  readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));
  readonly artboardTransform = computed(() => `translate(${this.pan().x}px, ${this.pan().y}px)`);

  readonly contextMenu = signal<CanvasContextMenu | null>(null);
  readonly addActionIcon = LucideZap;

  // ─── Preview: widgets are locked and clicks run the page's workflows ─────
  readonly previewMode = signal(false);
  private previewPageId: string | null = null;

  constructor() {
    // Live-update a widget when its props change (sidebar edits, preview)
    const propPatches = this.layoutState.propPatch$.subscribe(({ id, props }) => {
      const ref = this.widgetRefs.get(id);
      ref?.setInput('props', props);
      ref?.changeDetectorRef.markForCheck();
    });

    // Load the page of the active tab into the grid
    effect(() => {
      const tabId = this.tabs.activeTabId();
      if (!tabId || !this.gridReady()) return;
      // untracked: only a tab switch should rebuild the grid, not every layout or prop change
      untracked(() => {
        this.stopPreview();
        this.layoutState.loadLayoutForTab(tabId).subscribe((layout) => this.restoreLayout(tabId, layout));
      });
    });

    this.destroyRef.onDestroy(() => {
      this.stopPreview();
      propPatches.unsubscribe();
      this.grid?.destroy(false);
      this.grid = null;
    });
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => this.zoomFit());

    const grid = GridStack.init(ROOT_GRID_OPTIONS, this.gridContainer().nativeElement);
    if (!grid) {
      console.error('The canvas grid could not be created.');
      return;
    }
    this.grid = grid;
    grid.on('added', (_event, nodes) => this.onAdded(grid, nodes));
    grid.on('removed', (_event, nodes) => this.onRemoved(nodes));
    grid.on('change', () => {
      if (!this.restoring) this.syncLayout();
    });
    grid.on('resizestop', (_event, el) => {
      // A container's nested grid keeps as many rows as the container is high
      if (el.gridstackNode) syncSubGridRows(el.gridstackNode);
      this.syncLayout();
    });
    this.gridReady.set(true);
  }

  // ─── Selection, delete key ───────────────────────────────────────────────
  /** Clicking a widget selects it; clicking the empty canvas clears the selection. */
  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (this.previewMode()) return;
    const target = event.target as HTMLElement;
    // Clicks outside the canvas (e.g. in a sidebar) keep the selection
    if (!target.closest('.canvas-viewport')) return;

    const item = target.closest<HTMLElement>('.grid-stack-item');
    document.querySelectorAll('.grid-stack-item.selected').forEach((el) => {
      if (el !== item) el.classList.remove('selected');
    });
    if (item) {
      item.classList.add('selected');
      const id = item.getAttribute('data-gs-id');
      if (id) this.selection.select(id);
    } else {
      this.selection.clear();
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if ((event.key !== 'Delete' && event.key !== 'Backspace') || isTyping()) return;
    // The deepest selected widget (a widget inside a selected container wins)
    const selected = document.querySelectorAll<GridItemHTMLElement>('.grid-stack-item.selected');
    const el = selected[selected.length - 1];
    const grid = el?.gridstackNode?.grid;
    if (el && grid) this.removeWidget(grid, el);
  }

  // ─── Context menu ────────────────────────────────────────────────────────
  closeContextMenu(): void {
    this.contextMenu.set(null);
  }

  /** "Add action": a new action on the button's click flow (trigger created if missing), then the workflow editor. */
  addActionToItem(id: ComponentId): void {
    this.closeContextMenu();
    const tabId = this.tabs.activeTabId();
    if (!tabId) return;

    // Switch right away; the new nodes show up in the workflow editor as soon as they're saved
    this.tabs.setMode('workflow');
    // A widget that isn't saved yet has a temporary id a trigger couldn't point to
    if (!isSavedId(toComponentId(id))) {
      console.warn('This button is not saved yet, so no trigger could be created for it.');
      return;
    }
    this.workflowState.addActionForElement(tabId, id.toString(), CLICK_EVENT).subscribe({
      error: (err) => console.error('Failed to update the page workflow', err),
    });
  }

  // ─── Preview ─────────────────────────────────────────────────────────────
  togglePreview(): void {
    if (this.previewMode()) {
      this.stopPreview();
      return;
    }
    const tabId = this.tabs.activeTabId();
    if (!tabId || !this.grid) return;

    this.selection.clear();
    document.querySelectorAll('.grid-stack-item.selected').forEach((el) => el.classList.remove('selected'));
    this.grid.setStatic(true);
    this.previewPageId = tabId;
    this.previewMode.set(true);
    this.previewSession.start(tabId);
  }

  /** In preview, clicking a button runs the workflows triggered by it. */
  onViewportClick(event: MouseEvent): void {
    if (!this.previewMode() || !this.previewPageId) return;
    const item = (event.target as HTMLElement).closest('.grid-stack-item');
    const id = item?.getAttribute('data-gs-id');
    if (id && widgetType(item as HTMLElement) === 'button') {
      this.workflowRuntime.handleEvent(this.previewPageId, id, CLICK_EVENT);
    }
  }

  private stopPreview(): void {
    if (!this.previewMode()) return;
    this.grid?.setStatic(false);
    if (this.previewPageId) this.workflowRuntime.reset(this.previewPageId);
    this.previewSession.stop();
    this.previewPageId = null;
    this.previewMode.set(false);
  }

  // ─── Pan & zoom ──────────────────────────────────────────────────────────
  onPanBy(delta: Point): void {
    this.pan.update((p) => ({ x: p.x + delta.x, y: p.y + delta.y }));
  }

  /** Zoom toward the cursor; the artboard is anchored at the viewport's center. */
  onZoomAt({ factor, client }: ZoomAtEvent): void {
    const rect = this.viewport().nativeElement.getBoundingClientRect();
    const anchor = { x: client.x - rect.left - rect.width / 2, y: client.y - rect.top - rect.height / 2 };
    const newZoom = clamp(this.zoom() * factor, CANVAS_MIN_ZOOM, CANVAS_MAX_ZOOM);
    this.pan.set(zoomAround(anchor, this.pan(), this.zoom(), newZoom));
    this.zoom.set(newZoom);
  }

  onCommand(command: ViewportCommand): void {
    switch (command) {
      case 'zoom-in': this.zoomIn(); break;
      case 'zoom-out': this.zoomOut(); break;
      case 'zoom-reset': this.zoomReset(); break;
      case 'fit': this.zoomFit(); break;
    }
  }

  zoomIn(): void { this.setZoom(this.zoom() * BUTTON_ZOOM_STEP); }
  zoomOut(): void { this.setZoom(this.zoom() / BUTTON_ZOOM_STEP); }
  zoomReset(): void { this.setZoom(1); }

  /** Fit the whole artboard into the viewport, centered. */
  zoomFit(): void {
    const vp = this.viewport().nativeElement;
    const fit = Math.min(
      (vp.clientWidth - CANVAS_FIT_PADDING * 2) / ARTBOARD_WIDTH,
      (vp.clientHeight - CANVAS_FIT_PADDING * 2) / ARTBOARD_HEIGHT,
    );
    this.zoom.set(Math.max(CANVAS_MIN_ZOOM, fit));
    this.pan.set({ x: 0, y: 0 });
  }

  private setZoom(zoom: number): void {
    this.zoom.set(clamp(zoom, CANVAS_MIN_ZOOM, CANVAS_MAX_ZOOM));
  }

  // ─── Grid: restore, sync, events ─────────────────────────────────────────
  /** Replace the grid's content with a page's stored layout. */
  private restoreLayout(tabId: string, layout: LayoutItem[]): void {
    const grid = this.grid;
    if (!grid) return;

    this.restoring = true;
    grid.removeAll();
    for (const item of flattenTree(layout)) {
      if (item.id != null) this.savedGeometry.set(item.id.toString(), geometryOf(item));
    }
    this.addStoredWidgets(tabId, grid, layout);
    this.restoring = false;
  }

  private addStoredWidgets(tabId: string, grid: GridStack, items: LayoutItem[]): void {
    for (const item of items) {
      const { el, content } = addStoredWidget(grid, item);
      this.attachRemoveButton(el, grid);

      if (item.id != null && item.type !== 'container') {
        this.mountWidget(item.id.toString(), item.type ?? 'unknown', content, item.props);
        if (isSavedId(item.id)) this.layoutState.loadComponentProps(tabId, item.id);
      }

      const subGrid = el.gridstackNode?.subGrid;
      if (item.children?.length && subGrid) this.addStoredWidgets(tabId, subGrid, item.children);
    }
  }

  /** A widget was added to a grid: dropped from the palette, moved between grids, or restored. */
  private onAdded(rootGrid: GridStack, nodes: GridStackNode[]): void {
    const tabId = this.tabs.activeTabId();

    for (const node of nodes) {
      const type = widgetType(node.el);
      const id = node.el?.getAttribute('data-gs-id') || node.id || newTemporaryId();
      if (node.el) {
        if (node.grid) this.attachRemoveButton(node.el, node.grid);
        node.el.setAttribute('data-gs-id', id);
        node.id = id;
      }
      this.prepareContent(rootGrid, node, id, type);
      if (!this.restoring && tabId) this.persistAdded(tabId, node);
    }

    // Containers something was dropped into grow to fit it
    nodes.forEach(growContainerForDrop);
    this.syncLayout();
  }

  /** Turn a dropped palette card into the real widget (or a container's nested grid). */
  private prepareContent(rootGrid: GridStack, node: GridStackNode, id: string, type: string): void {
    const content = node.el?.querySelector<HTMLElement>('.grid-stack-item-content');
    if (!content || !node.el) return;
    // The palette card's own styling came along with the clone
    content.classList.remove('palette-card');

    if (type === 'container') {
      content.innerHTML = '';
      rootGrid.makeSubGrid(node.el, subGridOptions(node.h ?? 1), undefined, false);
      content.classList.add('container-widget');
      return;
    }
    // Moved into/out of a container: GridStack re-adds the same element, so the live widget is already there
    if (this.widgetRefs.get(id)?.location.nativeElement.parentElement === content) return;

    content.innerHTML = '';
    this.mountWidget(id, type, content, {});
    content.addEventListener('contextmenu', (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      // Actions can only be attached to buttons for now, and not while previewing
      if (type !== 'button' || this.previewMode()) return;
      // Read the id now: it changes from the temporary one once the backend has saved the widget
      const currentId = content.closest('.grid-stack-item')?.getAttribute('data-gs-id') ?? id;
      this.contextMenu.set({ x: event.clientX, y: event.clientY, item: { id: currentId, type } });
    });
  }

  /** Create a new widget in the backend, or save the new place of a moved one. */
  private persistAdded(tabId: string, node: GridStackNode): void {
    const id = nodeId(node);
    const parentId = parentIdOf(node);
    const item: LayoutItem = {
      id,
      type: widgetType(node.el),
      x: node.x || 0,
      y: node.y || 0,
      w: node.w || 100,
      h: node.h || 40,
      parentId,
    };

    if (isSavedId(id)) {
      this.layoutState.updateComponent(tabId, item).subscribe();
      return;
    }
    this.layoutState.addComponent(tabId, item).subscribe((dto) => {
      if (dto?.id != null) this.adoptSavedId(tabId, node, id?.toString() ?? '', dto);
    });
  }

  /** A new widget got its database id: move everything from the temporary id over to it. */
  private adoptSavedId(tabId: string, node: GridStackNode, tempId: string, dto: UiComponentDto): void {
    const savedId = dto.id!;
    const newId = savedId.toString();
    const { type, props } = dto;
    // GridStack may have replaced the node after the drop; use the one in the grid now
    const current = node.grid?.engine.nodes.find((n) => n.id === tempId || n.el?.getAttribute('data-gs-id') === tempId) ?? node;

    current.el?.setAttribute('data-gs-id', newId);
    if (type) current.el?.setAttribute('data-type', type);
    current.id = newId;

    const ref = this.widgetRefs.get(tempId);
    if (ref && tempId !== newId) {
      this.widgetRefs.delete(tempId);
      this.widgetRefs.set(newId, ref);
      ref.setInput('id', newId);
      if (props) ref.setInput('props', { ...widgetDefinition(type).defaultProps, ...props });
    }

    const geometry: GridGeometry = {
      x: current.x ?? dto.x ?? 0,
      y: current.y ?? dto.y ?? 0,
      w: current.w ?? dto.w ?? 100,
      h: current.h ?? dto.h ?? 40,
      parentId: dto.parentId ?? undefined,
    };
    this.savedGeometry.set(newId, geometry);
    this.syncLayout();
    // Now that the layout knows the saved id, pull the component's props (type defaults included)
    this.layoutState.loadComponentProps(tabId, savedId);
    // Moved or resized while the create request was in flight: save the current geometry
    if (current.x !== dto.x || current.y !== dto.y || current.w !== dto.w || current.h !== dto.h) {
      this.layoutState.updateComponent(tabId, { id: savedId, type: type ?? 'unknown', ...geometry }).subscribe();
    }
  }

  private onRemoved(nodes: GridStackNode[]): void {
    for (const node of nodes) {
      const id = nodeId(node)?.toString();
      if (id) {
        this.widgetRefs.get(id)?.destroy();
        this.widgetRefs.delete(id);
      }
      node.subGrid?.destroy(false);
    }
    this.syncLayout();
  }

  /** Read the layout back from the grid, persist changed geometry, and update the layout state. */
  private syncLayout(): void {
    if (!this.grid) return;
    fitContainersToContent(this.grid.engine.nodes);
    const layout = toLayoutItems(this.grid.engine.nodes);
    const tabId = this.tabs.activeTabId();
    if (this.restoring || !tabId) return;

    for (const item of flattenTree(layout)) {
      if (!isSavedId(item.id)) continue;
      const key = item.id.toString();
      const geometry = geometryOf(item);
      const last = this.savedGeometry.get(key);
      if (!last || !sameGeometry(last, geometry)) {
        this.layoutState.updateComponent(tabId, item).subscribe();
        this.savedGeometry.set(key, geometry);
      }
    }
    this.layoutState.saveLayout(tabId, layout);
  }

  // ─── Widgets ─────────────────────────────────────────────────────────────
  /** Create the widget's Angular component inside a grid item. */
  private mountWidget(id: string, type: string, content: HTMLElement, props?: WidgetProps): void {
    const definition = widgetDefinition(type);
    // Make sure the properties panel has the prop definitions for this widget type
    this.widgetRegistry.loadDefinitionsForType(type);
    // A widget may already be mounted for this id (the grid's 'added' event) — replace it,
    // so a hidden duplicate doesn't receive the prop updates
    this.widgetRefs.get(id)?.destroy();

    const ref = this.vcr.createComponent(definition.component);
    ref.setInput('id', id);
    ref.setInput('props', { ...definition.defaultProps, ...props });
    if (definition.type === DEFAULT_WIDGET_TYPE) ref.setInput('type', type);
    ref.changeDetectorRef.detectChanges();

    content.appendChild(ref.location.nativeElement);
    this.widgetRefs.set(id, ref);
  }

  private attachRemoveButton(el: HTMLElement, grid: GridStack): void {
    if (el.querySelector('.widget-remove-btn')) return;
    el.appendChild(createRemoveButton(() => this.removeWidget(grid, el)));
  }

  private removeWidget(grid: GridStack, el: HTMLElement): void {
    const id = toComponentId(el.getAttribute('data-gs-id'));
    grid.removeWidget(el, true, true);
    if (id != null) this.layoutState.deleteComponent(id).subscribe();
  }
}
