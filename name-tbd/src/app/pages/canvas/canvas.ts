import {
  AfterViewInit, Component, ComponentRef, DestroyRef, ElementRef, HostListener, ViewContainerRef,
  computed, effect, inject, signal, untracked, viewChild,
} from '@angular/core';
import { GridItemHTMLElement, GridStack, GridStackNode } from 'gridstack';
import {
  LucideAlignCenterHorizontal, LucideAlignCenterVertical, LucideAlignHorizontalDistributeCenter, LucideAlignStartHorizontal,
  LucideAlignStartVertical, LucideAlignVerticalDistributeCenter, LucideClipboardPaste, LucideCopy, LucideCopyPlus,
  LucideCrosshair, LucideTrash2, LucideZap,
} from '@lucide/angular';
import { LayoutStateService } from '../../_services/layout-state.service';
import { SelectionService } from '../../_services/selection.service';
import { SidebarStateService } from '../../_services/sidebar-state.service';
import { ClipboardService } from '../../_services/clipboard.service';
import { ToastService } from '../../_services/toast.service';
import { PROPERTIES_TAB_ID } from '../../_constants/sidebar.constants';
import { TabsService } from '../../_services/tabs.service';
import { WorkflowRuntimeService } from '../../core/workflow/workflow-runtime.service';
import { AppMessages } from '../../core/rendering/app-messages/app-messages';
import { PreviewSessionService } from '../../_services/preview-session.service';
import { WidgetEventsService } from '../../core/services/widget-events.service';
import { LayoutOverlay } from './layout-overlay/layout-overlay';
import { WorkflowStateService } from '../../_services/workflow-state.service';
import { ViewportCommand, ViewportControls, ZoomAtEvent } from '../../_directives/viewport-controls.directive';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { ContextMenu } from '../../components/context-menu/context-menu';
import { ContextMenuItem } from '../../components/context-menu/context-menu-item';
import { ContextMenuDivider } from '../../components/context-menu/context-menu-divider';
import { ZoomControls } from '../../components/zoom-controls/zoom-controls';
import { ZoomButton } from '../../components/zoom-controls/zoom-button';
import { DEFAULT_WIDGET_TYPE, widgetDefinition } from '../../_constants/widget-registry.constants';
import {
  ARTBOARD_HEIGHT, ARTBOARD_WIDTH, CANVAS_FIT_PADDING, CANVAS_MAX_ZOOM, CANVAS_MIN_ZOOM, CELL_SIZE, GRID_COLUMNS, GRID_ROWS,
  ROOT_GRID_OPTIONS, editorPageRows,
} from '../../_constants/artboard.constants';
import { widgetTrigger } from '../../_constants/workflow.constants';
import { CanvasContextMenu } from '../../_types/canvas.types';
import { ComponentId, GridGeometry, LayoutItem, WidgetProps } from '../../_types/layout.types';
import { Point } from '../../_types/viewport.types';
import { toComponentId } from '../../_utils/component-id.utils';
import { IdRegistry } from '../../_services/id-registry.service';
import { HistoryService } from '../../editor/commands/history.service';
import { AddWidgets, DeleteWidgets, MoveWidgets, WidgetPlace } from '../../editor/commands/widget-commands';
import { recordGraphChange } from '../../editor/commands/workflow-commands';
import {
  addStoredWidget, createRemoveButton, fitContainersToContent, geometryOf, growContainerForDrop, isContainerType,
  makeContainer, nodeId, parentIdOf, sameGeometry, syncSubGridRows, toLayoutItems, widgetType,
} from '../../_utils/grid.utils';
import { blueprintGridStyle, clamp, zoomAround } from '../../_utils/viewport.utils';
import { isTyping, matchesShortcut } from '../../_utils/keyboard.utils';
import { shortcutKeys } from '../../_constants/keyboard-shortcuts.constants';
import { findInTree, flattenTree } from '../../_utils/layout-tree.utils';
import { propText } from '../../_utils/widget-props.utils';
import { centeredAxes, centeredPosition, CenterAxis } from '../../_utils/centering.utils';
import { align, AlignEdge, distribute, DistributeAxis, moveGroup, PlacedRect } from '../../_utils/align.utils';
import { AlignToolbar } from '../../components/align-toolbar/align-toolbar';
import { containerFrame, isFlushType } from '../../core/rendering/widget-components';
import { containerClass, tabNames, tabOf, visibleChildren } from '../../core/rendering/containers';
import { ActiveTabsService } from '../../core/services/active-tabs.service';
import { AppThemeService } from '../../core/services/app-theme.service';
import { ModalStateService } from '../../core/services/modal-state.service';
import { propBool } from '../../_utils/widget-props.utils';

const BUTTON_ZOOM_STEP = 1.25;


/**
 * The page editor: an artboard (a desktop browser window's page area) with a GridStack grid (containers get nested grids).
 * Widgets are Angular components mounted into the grid items; GridStack owns the layout,
 * and every move/resize/drop is persisted. In preview, widgets fire their events (WidgetEventsService) and the workflows run.
 */
@Component({
  selector: 'app-canvas',
  imports: [ViewportControls, ZoomControls, ZoomButton, ContextMenu, ContextMenuItem, ContextMenuDivider, LayoutOverlay, AlignToolbar, AppMessages],
  templateUrl: './canvas.html',
  styleUrl: './canvas.scss',
})
export class Canvas implements AfterViewInit {
  private readonly tabs = inject(TabsService);
  private readonly layoutState = inject(LayoutStateService);
  private readonly selection = inject(SelectionService);
  private readonly sidebars = inject(SidebarStateService);
  private readonly clipboard = inject(ClipboardService);
  private readonly toasts = inject(ToastService);
  private readonly workflowState = inject(WorkflowStateService);
  private readonly workflowRuntime = inject(WorkflowRuntimeService);
  private readonly previewSession = inject(PreviewSessionService);
  private readonly widgetEvents = inject(WidgetEventsService);
  private readonly registry = inject(IdRegistry);
  private readonly history = inject(HistoryService);
  private readonly activeTabs = inject(ActiveTabsService);
  private readonly theme = inject(AppThemeService);
  readonly modals = inject(ModalStateService);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly gridContainer = viewChild.required<ElementRef<HTMLElement>>('gridContainer');
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');

  private grid: GridStack | null = null;
  private readonly gridReady = signal(false);
  /** True while a saved layout is being put into the grid (its events must not be persisted). */
  private restoring = false;
  /**
   * A user gesture is going on (a drag, resize, drop, delete or "Center"): only what changes during
   * one is recorded for undo. GridStack also moves things by itself (e.g. laying a rebuilt page out
   * again); that's saved, but isn't a step anyone could undo, and mustn't wipe out what can be redone.
   */
  private gesture = false;
  private gestureEnd: ReturnType<typeof setTimeout> | undefined;
  /** A selected widget being dragged with the other selected widgets of its grid (see startGroupDrag). */
  private groupDrag: GroupDrag | null = null;
  /** A selected widget pressed without a modifier: selected alone on release, unless it's dragged first. */
  private selectOnRelease: string | null = null;
  /** Live widget components by component id. */
  private readonly widgetRefs = new Map<string, ComponentRef<BaseWidget>>();
  /** The content element of each container (by component id), which shows its background. */
  private readonly containerContents = new Map<string, HTMLElement>();
  /**
   * The widgets of each tabs widget (by component id) on its other tabs: not in its grid (they'd
   * collide with the shown tab's), but part of the page all the same.
   */
  private readonly hiddenChildren = new Map<string, LayoutItem[]>();
  /** The last saved geometry of each widget, to only send what changed. */
  private readonly savedGeometry = new Map<string, GridGeometry>();

  /** The page's height in rows: one screen, or down to its lowest widget plus room to place more. */
  readonly pageRows = signal(editorPageRows([]));
  /** Where one screen ends (a 1080p window), marked on taller pages. */
  readonly screenHeight = ARTBOARD_HEIGHT;
  /**
   * The artboard's size and cell lines (see canvas.scss): it grows downward from the first screen.
   * Plus the app's theme, which every widget on it reads.
   */
  readonly artboardSize = computed(() => ({
    ...this.theme.variables(),
    '--artboard-width': `${ARTBOARD_WIDTH}px`,
    '--artboard-height': `${this.pageRows() * CELL_SIZE}px`,
    '--screen-height': `${ARTBOARD_HEIGHT}px`,
    '--grid-columns': String(GRID_COLUMNS),
    '--grid-rows': String(this.pageRows()),
  }));

  // ─── Zoom / pan (the artboard is centered; pan moves it from there) ──────
  readonly zoom = signal(1);
  readonly pan = signal<Point>({ x: 0, y: 0 });
  readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));
  readonly artboardTransform = computed(() => `translate(${this.pan().x}px, ${this.pan().y}px)`);

  /** The blueprint grid behind the artboard, anchored to its top-left corner so it pans and zooms along. */
  readonly backdropGrid = computed(() => {
    const zoom = this.zoom(), pan = this.pan();
    const corner = { x: pan.x - (ARTBOARD_WIDTH / 2) * zoom, y: pan.y - (ARTBOARD_HEIGHT / 2) * zoom };
    return blueprintGridStyle(corner, zoom, 'center');
  });

  readonly contextMenu = signal<CanvasContextMenu | null>(null);
  readonly icons = {
    addAction: LucideZap, copy: LucideCopy, duplicate: LucideCopyPlus, paste: LucideClipboardPaste,
    centerX: LucideAlignCenterVertical, centerY: LucideAlignCenterHorizontal, centerBoth: LucideCrosshair, delete: LucideTrash2,
    alignLeft: LucideAlignStartVertical, alignTop: LucideAlignStartHorizontal,
    distributeX: LucideAlignHorizontalDistributeCenter, distributeY: LucideAlignVerticalDistributeCenter,
  };
  readonly canPaste = this.clipboard.hasContent;
  /** Whether the right-clicked widget fires a trigger an action can be added to (one widget only). */
  readonly canAddAction = computed(() => {
    const item = this.contextMenu()?.item;
    return !!item && !!widgetTrigger(item.type) && this.selection.selectedIds().length === 1;
  });
  readonly selectionCount = computed(() => this.selection.selectedIds().length);

  // ─── Preview: widgets are locked and clicks run the page's workflows ─────
  readonly previewMode = signal(false);
  readonly previewKeys = shortcutKeys('preview');
  private previewPageId: string | null = null;

  constructor() {
    // Live-update a widget when its props change (sidebar edits, preview)
    const propPatches = this.layoutState.propPatch$.subscribe(({ id, props }) => {
      const ref = this.widgetRefs.get(id);
      ref?.setInput('props', props);
      ref?.changeDetectorRef.markForCheck();
      this.paintContainer(id, props);
    });

    // Load the page of the active tab into the grid
    effect(() => {
      const tabId = this.tabs.activeTabId();
      if (!tabId || !this.gridReady()) return;
      // untracked: only a tab switch should rebuild the grid, not every layout or prop change
      untracked(() => {
        this.stopPreview();
        this.layoutState.loadLayoutForTab(tabId).subscribe((layout) => {
          this.restoreLayout(tabId, layout);
          // Arrived here by following a link in a preview: the preview goes on on this page
          if (this.previewSession.resumesOn(tabId)) this.togglePreview();
        });
      });
    });

    // Mark the selected widgets, also when they're selected elsewhere (e.g. in the layers panel)
    effect(() => this.markSelection(this.selection.selectedIds()));

    // Widgets' own events (e.g. a table row double-click) run the flows they trigger
    const widgetEvents = this.widgetEvents.events$.subscribe(({ pageId, elementId, event }) => {
      if (this.previewMode()) this.workflowRuntime.handleEvent(pageId, elementId, event);
    });

    // New widgets were saved: their elements go by the real ids from now on
    const savedIds = this.registry.mapped$.subscribe((ids) => ids.forEach((id, ref) => this.adoptSavedId(ref, id)));

    // A tabs widget shows another tab: its grid now holds that tab's widgets
    const tabSwitches = this.activeTabs.changed$.subscribe(() => {
      const tabId = this.tabs.activeTabId();
      if (tabId && this.grid) this.restoreLayout(tabId, this.layoutState.getLayout(tabId));
    });

    // In a preview, dialogs only show while open (over the page, see .preview-backdrop)
    effect(() => this.markModals(this.previewMode(), this.modals.openIds()));

    // Undo or redo changed this page's widgets: show them as they are now
    const undone = this.history.applied$.subscribe((pageId) => {
      if (pageId !== this.tabs.activeTabId()) return;
      this.restoreLayout(pageId, this.layoutState.getLayout(pageId));
      const layout = this.layoutState.getLayout(pageId);
      this.selection.selectMany(this.selection.selectedIds().filter((id) => findInTree(layout, id)));
    });

    this.destroyRef.onDestroy(() => {
      this.stopPreview();
      propPatches.unsubscribe();
      widgetEvents.unsubscribe();
      savedIds.unsubscribe();
      undone.unsubscribe();
      tabSwitches.unsubscribe();
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
    this.wireGrid(grid);
    this.gridReady.set(true);
  }

  // ─── Selection, delete key ───────────────────────────────────────────────
  /**
   * Clicking a widget selects it (Ctrl/⌘/Shift+click adds it to the selection, or takes it out);
   * clicking the empty canvas clears the selection. A right-click keeps a selection it's part of.
   * Pressing a widget that's already selected keeps the selection, so dragging it takes the others
   * along; released without a drag, it's selected alone.
   */
  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    this.selectOnRelease = null;
    if (this.previewMode()) return;
    const target = event.target as HTMLElement;
    // Clicks outside the canvas (e.g. in a sidebar or the context menu) and on its toolbars keep the selection
    if (!target.closest('.canvas-viewport') || target.closest('app-align-toolbar')) return;

    const id = target.closest<HTMLElement>('.grid-stack-item')?.getAttribute('data-gs-id');
    if (!id) {
      if (event.button !== 2) this.selection.clear();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.shiftKey) this.selection.toggle(id);
    else if (!this.selection.isSelected(id)) this.selection.select(id);
    else if (event.button === 0 && this.selection.selectedIds().length > 1) this.selectOnRelease = id;
  }

  @HostListener('document:pointerup')
  onDocumentPointerUp(): void {
    if (this.selectOnRelease) this.selection.select(this.selectOnRelease);
    this.selectOnRelease = null;
  }

  /** Double-clicking a widget selects it and shows its properties, in whichever sidebar that tab is. */
  @HostListener('dblclick', ['$event'])
  onDoubleClick(event: MouseEvent): void {
    if (this.previewMode()) return;
    // The innermost widget under the pointer (a widget inside a container wins)
    const id = (event.target as HTMLElement).closest('.grid-stack-item')?.getAttribute('data-gs-id');
    if (!id) return;
    this.selection.select(id);
    this.sidebars.open(PROPERTIES_TAB_ID);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (isTyping()) return;
    if (matchesShortcut(event, 'preview')) {
      event.preventDefault();
      this.togglePreview();
      return;
    }
    if (this.previewMode()) return;
    const commands: Record<string, () => void> = {
      copy: () => this.copySelection(),
      paste: () => void this.paste(),
      duplicate: () => void this.duplicateSelection(),
    };
    for (const [id, run] of Object.entries(commands)) {
      if (!matchesShortcut(event, id)) continue;
      event.preventDefault();
      run();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') this.deleteSelection();
  }

  // ─── Context menu ────────────────────────────────────────────────────────
  /** Right-click: the widget's menu (it's selected first, unless it's part of the selection), or paste on the empty page. */
  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): void {
    if (this.previewMode()) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.canvas-viewport')) return;
    event.preventDefault();
    const el = target.closest<HTMLElement>('.grid-stack-item');
    const id = el?.getAttribute('data-gs-id');
    if (id && !this.selection.isSelected(id)) this.selection.select(id);
    const item = id ? { id, type: widgetType(el ?? undefined) } : undefined;
    if (!item && !this.canPaste()) return;
    this.contextMenu.set({ x: event.clientX, y: event.clientY, item });
  }

  closeContextMenu(): void {
    this.contextMenu.set(null);
  }

  // ─── Copy, paste, duplicate, delete, center ──────────────────────────────
  /** Copies the selected widgets (and the flows they start). Returns how many. */
  copySelection(quiet = false): number {
    const tabId = this.tabs.activeTabId();
    const count = tabId ? this.clipboard.copy(tabId, this.savedSelection()) : 0;
    if (count && !quiet) this.toasts.show(count === 1 ? 'Copied 1 widget' : `Copied ${count} widgets`);
    return count;
  }

  /**
   * Pastes the copied widgets onto this page in the nearest free place (nothing on it moves),
   * then selects the copies; says so when there's no room for them.
   */
  async paste(): Promise<void> {
    const tabId = this.tabs.activeTabId();
    if (!tabId || !this.canPaste()) return;
    try {
      const result = await this.clipboard.paste(tabId);
      if ('noRoom' in result) {
        this.toasts.show('There is no free space for the copies here. Make some room (or make the container bigger) and paste again.', 'warning');
        return;
      }
      if (result.items.length > 0) this.history.record(new AddWidgets(tabId, result.items, result.nodes, result.connections, 'Paste'));
      if (this.tabs.activeTabId() !== tabId) return;
      this.restoreLayout(tabId, this.layoutState.getLayout(tabId));
      this.selection.selectMany(result.ids);
    } catch (err) {
      console.error('Failed to paste the widgets', err);
      this.toasts.show('The widgets could not be pasted.', 'warning');
    }
  }

  async duplicateSelection(): Promise<void> {
    if (this.copySelection(true) > 0) await this.paste();
  }

  /** Deletes every selected widget (one inside a selected container goes with the container). */
  deleteSelection(): void {
    for (const id of this.selection.selectedIds()) {
      const el = this.itemElement(id);
      const grid = el?.gridstackNode?.grid;
      if (el && grid && el.isConnected) this.removeWidget(grid, el);
    }
    this.selection.clear();
  }

  /** Moves each selected widget to the middle of what it's in (the page, or its container) on the axis. */
  center(axis: CenterAxis): void {
    this.placeSelection((items, room) => items.map((item) => ({ ...item, ...centeredPosition(item, room, axis) })));
  }

  /** Lines the selected widgets up on an edge or center line (in each grid: the page, or a container). */
  alignSelection(edge: AlignEdge): void {
    this.placeSelection((items) => align(items, edge));
  }

  /** Spaces the selected widgets evenly (three or more in a grid). */
  distributeSelection(axis: DistributeAxis): void {
    this.placeSelection((items) => distribute(items, axis));
  }

  /**
   * Moves the selected widgets to where `place` puts them, per grid they're in (the page, or a
   * container: widgets only line up with others in the same one). One undo step.
   */
  private placeSelection(place: (items: PlacedRect[], room: { w: number; h: number }) => PlacedRect[]): void {
    const byGrid = new Map<GridStack, { el: GridItemHTMLElement; rect: PlacedRect }[]>();
    for (const id of this.selection.selectedIds()) {
      const el = this.itemElement(id);
      const grid = el?.gridstackNode?.grid;
      if (!el || !grid) continue;
      byGrid.set(grid, [...(byGrid.get(grid) ?? []), { el, rect: { id, ...rectOf(el.gridstackNode!) } }]);
    }
    this.beginGesture();
    for (const [grid, entries] of byGrid) {
      const placed = place(entries.map((e) => e.rect), roomOf(grid));
      grid.batchUpdate();
      placed.forEach((rect, i) => grid.update(entries[i].el, { x: rect.x, y: rect.y }));
      grid.batchUpdate(false);
    }
    this.syncLayout();
    this.endGestureSoon();
  }

  /** "Add action": a new action on the button's click flow (trigger created if missing), then the workflow editor. */
  addActionToItem(id: ComponentId, type: string): void {
    this.closeContextMenu();
    const tabId = this.tabs.activeTabId();
    const trigger = widgetTrigger(type);
    if (!tabId || !trigger) return;

    // Switch right away; a widget not saved yet is pointed at by its temporary id until it is
    this.tabs.setMode('workflow');
    recordGraphChange(this.history, this.workflowState, tabId, 'Add action',
      () => this.workflowState.addActionForElement(tabId, id.toString(), trigger.event));
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
    this.workflowRuntime.handlePageLoad(tabId);
  }

  private stopPreview(): void {
    if (!this.previewMode()) return;
    this.grid?.setStatic(false);
    if (this.previewPageId) this.workflowRuntime.reset(this.previewPageId);
    this.previewSession.stop();
    this.previewPageId = null;
    this.previewMode.set(false);
    this.modals.reset();
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

  /** Fit the artboard's first screen into the viewport, centered (a taller page goes on below). */
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
    this.containerContents.clear();
    this.hiddenChildren.clear();
    for (const item of flattenTree(layout)) {
      if (item.id != null) this.savedGeometry.set(item.id.toString(), geometryOf(item));
    }
    this.addStoredWidgets(tabId, grid, layout);
    this.pageRows.set(editorPageRows(layout));
    this.restoring = false;
    this.markSelection(this.selection.selectedIds());
    this.markModals(this.previewMode(), this.modals.openIds());
  }

  private addStoredWidgets(tabId: string, grid: GridStack, items: LayoutItem[]): void {
    for (const item of items) {
      const { el, content } = addStoredWidget(grid, item);
      this.attachRemoveButton(el, grid);

      const id = item.id?.toString();
      if (id != null && !isContainerType(item.type)) this.mountWidget(id, item.type ?? 'unknown', content, item.props);
      if (id != null && isContainerType(item.type)) this.prepareContainer(id, item.type!, content, item.props ?? {});

      const subGrid = el.gridstackNode?.subGrid;
      if (subGrid) this.wireGrid(subGrid);
      // A tabs widget's grid holds the widgets of the tab it shows; the others wait aside
      const shown = id != null ? visibleChildren(item, this.activeTabs.active(id)) : item.children ?? [];
      if (id != null && shown.length < (item.children?.length ?? 0)) {
        this.hiddenChildren.set(id, (item.children ?? []).filter((child) => !shown.includes(child)));
      }
      if (shown.length && subGrid) this.addStoredWidgets(tabId, subGrid, shown);
    }
  }

  /** A widget was added to a grid: dropped from the palette, moved between grids, or restored. */
  private onAdded(rootGrid: GridStack, nodes: GridStackNode[]): void {
    const tabId = this.tabs.activeTabId();

    const created: { id: string; type: string }[] = [];
    if (!this.restoring && nodes.some((node) => !(node.el?.getAttribute('data-gs-id') || node.id))) this.beginGesture();
    for (const node of nodes) {
      const type = widgetType(node.el);
      const known = node.el?.getAttribute('data-gs-id') || node.id;
      const id = known || this.registry.newRef();
      if (node.el) {
        if (node.grid) this.attachRemoveButton(node.el, node.grid);
        node.el.setAttribute('data-gs-id', id);
        node.id = id;
      }
      this.prepareContent(rootGrid, node, id, type);
      if (!this.restoring && tabId) {
        this.persistAdded(tabId, node, !known);
        if (!known) created.push({ id, type });
      }
    }

    // Containers something was dropped into grow to fit it
    nodes.forEach(growContainerForDrop);
    this.syncLayout();
    // Dropped widgets start with their type's defaults (the live widget too); the drop can be undone
    if (tabId && created.length > 0) {
      created.forEach(({ id, type }) => {
        this.layoutState.applyTypeDefaults(tabId, id, type);
        this.layoutState.nameNewWidget(tabId, id, type);
      });
      const layout = this.layoutState.getLayout(tabId);
      const items = created.map(({ id }) => findInTree(layout, id)).filter((item): item is LayoutItem => !!item);
      this.history.record(new AddWidgets(tabId, items.map((item) => structuredClone(item))));
      this.endGestureSoon();
    }
  }

  /** Turn a dropped palette card into the real widget (or a container's nested grid). */
  private prepareContent(rootGrid: GridStack, node: GridStackNode, id: string, type: string): void {
    const content = node.el?.querySelector<HTMLElement>('.grid-stack-item-content');
    if (!content || !node.el) return;
    // The palette card's own styling came along with the clone
    content.classList.remove('palette-card');

    if (isContainerType(type)) {
      content.innerHTML = '';
      this.wireGrid(makeContainer(rootGrid, node.el, content, type, node.h ?? 1));
      this.prepareContainer(id, type, content, {});
      return;
    }
    // Moved into/out of a container: GridStack re-adds the same element, so the live widget is already there
    if (this.widgetRefs.get(id)?.location.nativeElement.parentElement === content) return;

    content.innerHTML = '';
    content.classList.toggle('flush-widget', isFlushType(type));
    this.mountWidget(id, type, content, {});
  }

  /** Save a widget just dropped from the palette, or the new place of one moved into or out of a container. */
  private persistAdded(tabId: string, node: GridStackNode, isNew: boolean): void {
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

    // A widget moved into or out of a container: syncLayout saves (and records) its new place
    if (!isNew) return;
    this.layoutState.createWidget(tabId, { ...item, props: {} });
    if (id != null) this.savedGeometry.set(id.toString(), geometryOf(item));
  }

  /** A new widget was saved: its element, live widget and remembered geometry go by the real id. */
  private adoptSavedId(tempId: string, savedId: number): void {
    const newId = savedId.toString();
    const el = this.itemElement(tempId);
    if (!el) return;
    el.setAttribute('data-gs-id', newId);
    if (el.gridstackNode) el.gridstackNode.id = newId;

    const container = this.containerContents.get(tempId);
    if (container) {
      this.containerContents.delete(tempId);
      this.containerContents.set(newId, container);
    }
    const ref = this.widgetRefs.get(tempId);
    if (ref) {
      this.widgetRefs.delete(tempId);
      this.widgetRefs.set(newId, ref);
      ref.setInput('id', newId);
    }
    const geometry = this.savedGeometry.get(tempId);
    if (geometry) {
      this.savedGeometry.delete(tempId);
      this.savedGeometry.set(newId, geometry);
    }
  }

  private onRemoved(nodes: GridStackNode[]): void {
    for (const node of nodes) {
      const id = nodeId(node)?.toString();
      if (id) {
        this.widgetRefs.get(id)?.destroy();
        this.widgetRefs.delete(id);
        this.containerContents.delete(id);
      }
      node.subGrid?.destroy(false);
    }
    this.syncLayout();
  }

  /** Read the layout back from the grid, persist changed geometry, and update the layout state. */
  private syncLayout(): void {
    if (!this.grid) return;
    fitContainersToContent(this.grid.engine.nodes);
    const layout = toLayoutItems(this.grid.engine.nodes, undefined, (id) => this.hiddenChildren.get(String(id)) ?? []);
    // The page grows (or shrinks back) with its lowest widget
    this.pageRows.set(editorPageRows(layout));
    const tabId = this.tabs.activeTabId();
    if (this.restoring || !tabId) return;

    const before: WidgetPlace[] = [];
    const after: WidgetPlace[] = [];
    for (const item of flattenTree(layout)) {
      if (item.id == null) continue;
      const key = item.id.toString();
      const geometry = geometryOf(item);
      const last = this.savedGeometry.get(key);
      if (!last || !sameGeometry(last, geometry)) {
        // Unchanged widgets are skipped; the save queue merges a widget's moves into one change
        if (last) {
          this.layoutState.saveWidgetPlace(item);
          before.push({ id: item.id, ...last });
          after.push({ id: item.id, ...geometry });
        }
        this.savedGeometry.set(key, geometry);
      }
    }
    this.layoutState.saveLayout(tabId, layout);
    this.keepOnShownTabs(tabId, layout);
    // One drag (or "Center") is one step: moves recorded together merge (HistoryService)
    if (after.length > 0 && this.gesture) this.history.record(new MoveWidgets(tabId, before, after));
  }

  // ─── Widgets ─────────────────────────────────────────────────────────────
  /** Create the widget's Angular component inside a grid item. */
  private mountWidget(id: string, type: string, content: HTMLElement, props?: WidgetProps): void {
    const definition = widgetDefinition(type);
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

  /** A container's content element: its look, and its frame (tab bar, title bar) over its grid. */
  private prepareContainer(id: string, type: string, content: HTMLElement, props: WidgetProps): void {
    this.containerContents.set(id, content);
    this.paintContainer(id, props);
    if (containerFrame(type)) this.mountWidget(id, type, content, props);
  }

  /** A container shows its look and background color (none: the editor's faint fill, see canvas.scss). */
  private paintContainer(id: string, props: WidgetProps): void {
    const content = this.containerContents.get(id);
    if (!content) return;
    content.style.background = propText(props, 'background') ?? '';
    content.classList.remove('container-plain', 'container-card', 'container-outline');
    content.classList.add(containerClass(props));
  }

  /**
   * A widget showing in a tabs widget is on the tab it shows (e.g. one just dropped or moved there).
   * Said in its `tab` prop, saved like other prop changes.
   */
  private keepOnShownTabs(pageId: string, layout: LayoutItem[]): void {
    for (const tabsItem of flattenTree(layout).filter((item) => item.type === 'tabs' && item.id != null)) {
      const stored = findInTree(this.layoutState.getLayout(pageId), tabsItem.id!);
      const count = tabNames(stored?.props).length;
      const active = Math.min(this.activeTabs.active(String(tabsItem.id)), count - 1);
      const hidden = this.hiddenChildren.get(String(tabsItem.id)) ?? [];
      for (const child of stored?.children ?? []) {
        const shown = !hidden.some((h) => String(h.id) === String(child.id));
        if (child.id != null && shown && tabOf(child, count) !== active) this.layoutState.patchItemProps(pageId, child.id, { tab: String(active) });
      }
    }
  }

  /** In a preview, dialogs are hidden until opened; an open one shows over the page. While editing, all show. */
  private markModals(previewing: boolean, open: readonly string[]): void {
    document.querySelectorAll<HTMLElement>('.canvas-viewport .grid-stack-item[data-type="modal"]').forEach((el) => {
      const isOpen = open.includes(el.getAttribute('data-gs-id') ?? '');
      el.classList.toggle('modal-closed', previewing && !isOpen);
      el.classList.toggle('modal-open', previewing && isOpen);
    });
  }

  /** A click beside the open dialogs (preview) closes the topmost, unless it's set not to. */
  closeTopModal(): void {
    const top = this.modals.top();
    const item = top ? findInTree(this.layoutState.getLayout(this.tabs.activeTabId() ?? ''), top) : null;
    if (top && propBool(item?.props, 'closeOnBackdrop', true)) this.modals.close(top);
  }

  /** The grid item of a widget on the canvas. */
  private itemElement(id: string): GridItemHTMLElement | null {
    return document.querySelector<GridItemHTMLElement>(`.canvas-viewport .grid-stack-item[data-gs-id="${CSS.escape(id)}"]`);
  }

  private markSelection(ids: string[]): void {
    const selected = new Set(ids);
    document.querySelectorAll('.canvas-viewport .grid-stack-item').forEach((el) => {
      el.classList.toggle('selected', selected.has(el.getAttribute('data-gs-id') ?? ''));
    });
  }

  /** The selected widgets that are on the page. */
  private savedSelection(): string[] {
    const tabId = this.tabs.activeTabId();
    const layout = tabId ? this.layoutState.getLayout(tabId) : [];
    return this.selection.selectedIds().filter((id) => findInTree(layout, id));
  }

  /**
   * While a widget is dragged or resized in this grid, a dashed line marks the grid's middle on
   * each axis the widget is centered on (see .guide-x / .guide-y in canvas.scss).
   */
  /**
   * A grid's drag and resize events (the page's grid, and each container's): center guides while
   * dragging, the gesture's start and end, and a resized container's nested rows. All in one place,
   * because GridStack keeps only one handler per drag or resize event.
   */
  private wireGrid(grid: GridStack): void {
    const showGuides = (el: GridItemHTMLElement) => {
      const node = el.gridstackNode;
      if (!node) return;
      const room = roomOf(grid);
      const axes = centeredAxes({ x: node.x ?? 0, y: node.y ?? 0, w: node.w ?? 1, h: node.h ?? 1 }, room);
      grid.el.classList.toggle('guide-x', axes.x);
      grid.el.classList.toggle('guide-y', axes.y);
    };
    const clearGuides = () => grid.el.classList.remove('guide-x', 'guide-y');

    grid.on('dragstart', (_event: Event, el: GridItemHTMLElement) => {
      this.beginGesture();
      showGuides(el);
      this.startGroupDrag(grid, el);
    });
    grid.on('resizestart', (_event: Event, el: GridItemHTMLElement) => {
      this.beginGesture();
      showGuides(el);
    });
    grid.on('drag', (_event: Event, el: GridItemHTMLElement) => {
      showGuides(el);
      this.followGroupDrag(el);
    });
    grid.on('resize', (_event: Event, el: GridItemHTMLElement) => showGuides(el));
    grid.on('dragstop', (_event: Event, el: GridItemHTMLElement) => {
      clearGuides();
      this.dropGroupDrag(el);
      this.endGestureSoon();
    });
    grid.on('resizestop', (_event: Event, el: GridItemHTMLElement) => {
      clearGuides();
      // A container's nested grid keeps as many rows as the container is high
      if (el.gridstackNode) syncSubGridRows(el.gridstackNode);
      this.syncLayout();
      this.endGestureSoon();
    });
  }

  // ─── Dragging several widgets ────────────────────────────────────────────
  // GridStack drags one widget. When it's selected along with others in the same grid, they follow:
  // shown moved while dragging (CSS only), placed when it's dropped. The whole group stops at the
  // grid's edges (moveGroup); a widget dropped into another container goes there alone.

  private startGroupDrag(grid: GridStack, el: GridItemHTMLElement): void {
    this.groupDrag = null;
    this.selectOnRelease = null;
    const id = el.getAttribute('data-gs-id');
    const node = el.gridstackNode;
    if (!id || !node || !this.selection.isSelected(id)) return;
    const others = this.selection.selectedIds()
      .filter((other) => other !== id)
      .map((other) => ({ id: other, el: this.itemElement(other) }))
      .filter((o): o is { id: string; el: GridItemHTMLElement } => !!o.el?.gridstackNode && o.el.gridstackNode.grid === grid)
      .map((o) => ({ el: o.el, rect: { id: o.id, ...rectOf(o.el.gridstackNode!) } }));
    if (others.length === 0) return;
    this.groupDrag = { grid, el, start: { x: node.x ?? 0, y: node.y ?? 0 }, others };
    others.forEach((o) => o.el.classList.add('group-dragging'));
  }

  /** Where the other widgets go: the dragged one's offset in cells, cut short at the grid's edges. */
  private groupTargets(drag: GroupDrag): PlacedRect[] | null {
    const node = drag.el.gridstackNode;
    if (!node || node.grid !== drag.grid) return null;
    return moveGroup(drag.others.map((o) => o.rect), (node.x ?? 0) - drag.start.x, (node.y ?? 0) - drag.start.y, roomToMoveIn(drag.grid));
  }

  private followGroupDrag(el: GridItemHTMLElement): void {
    const drag = this.groupDrag;
    if (!drag || el !== drag.el) return;
    const targets = this.groupTargets(drag);
    drag.others.forEach(({ el: other, rect }, i) => {
      const target = targets?.[i];
      // Percent of its own size: whole cells, whatever the zoom
      other.style.transform = target
        ? `translate(${((target.x - rect.x) / rect.w) * 100}%, ${((target.y - rect.y) / rect.h) * 100}%)`
        : '';
    });
  }

  private dropGroupDrag(el: GridItemHTMLElement): void {
    const drag = this.groupDrag;
    this.groupDrag = null;
    if (!drag) return;
    drag.others.forEach(({ el: other }) => {
      other.style.transform = '';
      other.classList.remove('group-dragging');
    });
    if (el !== drag.el) return;
    // After GridStack has finished the drop (updating its grid during dragstop undoes part of it),
    // by where the dragged widget landed; still within the gesture (endGestureSoon comes after)
    setTimeout(() => {
      const targets = this.groupTargets(drag);
      if (!targets) return;
      drag.grid.batchUpdate();
      targets.forEach((target, i) => drag.grid.update(drag.others[i].el, { x: target.x, y: target.y }));
      drag.grid.batchUpdate(false);
      this.syncLayout();
    });
  }

  private beginGesture(): void {
    clearTimeout(this.gestureEnd);
    this.gesture = true;
  }

  /** Over once what the gesture set off has happened (GridStack's change events follow its stop events). */
  private endGestureSoon(): void {
    clearTimeout(this.gestureEnd);
    this.gestureEnd = setTimeout(() => (this.gesture = false), 0);
  }

  private attachRemoveButton(el: HTMLElement, grid: GridStack): void {
    if (el.querySelector('.widget-remove-btn')) return;
    el.appendChild(createRemoveButton(() => this.removeWidget(grid, el)));
  }

  private removeWidget(grid: GridStack, el: HTMLElement): void {
    const id = toComponentId(el.getAttribute('data-gs-id'));
    const tabId = this.tabs.activeTabId();
    // What's deleted, as it is now (with what's inside it), so undo can bring it back
    const deleted = id != null && tabId ? findInTree(this.layoutState.getLayout(tabId), id) : null;
    this.beginGesture();
    grid.removeWidget(el, true, true);
    if (id != null) this.layoutState.deleteWidget(id);
    if (deleted && tabId) this.history.record(new DeleteWidgets(tabId, [structuredClone(deleted)]));
    this.endGestureSoon();
  }
}

/** A widget dragged with the other selected widgets of its grid: where it started, and them as they were. */
interface GroupDrag {
  grid: GridStack;
  el: GridItemHTMLElement;
  start: { x: number; y: number };
  others: { el: GridItemHTMLElement; rect: PlacedRect }[];
}

function rectOf(node: GridStackNode): { x: number; y: number; w: number; h: number } {
  return { x: node.x ?? 0, y: node.y ?? 0, w: node.w ?? 1, h: node.h ?? 1 };
}

/**
 * The cells a grid has, to center and line up in: a container's fixed rows, or the page's (one
 * screen, or down to its lowest widget).
 */
function roomOf(grid: GridStack): { w: number; h: number } {
  if (grid.parentGridNode) return { w: grid.getColumn(), h: grid.opts.row || grid.opts.maxRow || grid.getRow() };
  return { w: grid.getColumn(), h: Math.max(GRID_ROWS, grid.getRow()) };
}

/** The cells widgets can be moved within: a container's, or the page's, which grows downward without end. */
function roomToMoveIn(grid: GridStack): { w: number; h: number } {
  return grid.parentGridNode ? roomOf(grid) : { w: grid.getColumn(), h: Number.POSITIVE_INFINITY };
}
