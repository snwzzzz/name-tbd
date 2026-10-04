import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { PageControllerService } from '../api/services/pageController.service';
import { ChangeOperation, PageContentDto } from '../api/models';
import { ComponentId, LayoutItem, PropPatch, WidgetProps } from '../_types/layout.types';
import { buildLayoutTree, findInTree, flattenTree, insertIntoTree, removeFromTree, updateInTree } from '../_utils/layout-tree.utils';
import { toApiProps, toConnection, toFlowNode, toLayoutItem } from '../_utils/api-mapper.utils';
import { isTemporaryId } from '../_utils/component-id.utils';
import { catalogDefaults, catalogWidget } from '../core/catalog/widget-catalog';
import { WorkflowStateService } from './workflow-state.service';
import { SaveQueue } from './save-queue.service';
import { IdRegistry } from './id-registry.service';

/**
 * The widgets of each page (by page id = editor tab id). Changes apply here right away and go to
 * the backend through the SaveQueue; new widgets have a temporary id until it's swapped for the
 * saved one (IdRegistry).
 */
@Injectable({ providedIn: 'root' })
export class LayoutStateService {
  private readonly pageService = inject(PageControllerService);
  private readonly workflows = inject(WorkflowStateService);
  private readonly saveQueue = inject(SaveQueue);

  private readonly layouts = signal<Record<string, LayoutItem[]>>({});

  /** Emits whenever a widget's props change, so the canvas can update the live widget. */
  readonly propPatch$ = new Subject<PropPatch>();

  constructor() {
    inject(IdRegistry).mapped$.subscribe((ids) => this.adoptSavedIds(ids));
  }

  /**
   * Load a page's widgets once (props complete: type defaults overlaid with the widget's own); later
   * calls get the cached layout. The page's workflow comes along in the same answer.
   */
  loadLayoutForTab(pageId: string): Observable<LayoutItem[]> {
    const cached = this.layouts()[pageId];
    if (cached) return of(cached);

    return this.pageService.getPageContent(Number(pageId)).pipe(
      tap((content: PageContentDto) => {
        const workflow = content.workflow;
        if (workflow?.id != null) {
          this.workflows.seedGraph(pageId, {
            workflowId: workflow.id,
            nodes: (workflow.nodes ?? []).map(toFlowNode),
            connections: (workflow.edges ?? []).map(toConnection),
          });
        }
      }),
      map((content) => buildLayoutTree((content.components ?? []).map(toLayoutItem))),
      tap((layout) => this.layouts.update((all) => ({ ...all, [pageId]: layout }))),
    );
  }

  getLayout(pageId: string): LayoutItem[] {
    return this.layouts()[pageId] ?? [];
  }

  /**
   * Store the grid layout (positions/sizes) while keeping the props already in the layout.
   * GridStack only knows about geometry, so a plain replace would wipe every prop value.
   */
  saveLayout(pageId: string, incoming: LayoutItem[]): void {
    const current = this.getLayout(pageId);
    const withProps = (items: LayoutItem[]): LayoutItem[] =>
      items.map((item) => ({
        ...item,
        props: (item.id != null ? findInTree(current, item.id)?.props : undefined) ?? item.props,
        children: item.children ? withProps(item.children) : item.children,
      }));

    this.layouts.update((all) => ({ ...all, [pageId]: withProps(incoming) }));
  }

  /** Save a widget's place: position, size and container (the caller passes the new ones). */
  saveWidgetPlace(item: LayoutItem): void {
    if (item.id == null) return;
    this.saveQueue.enqueue({
      op: 'updateWidget',
      ...target(item.id),
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      ...parent(item.parentId),
    });
  }

  /** Save a widget just placed on the page (it has a temporary id; its props are what it has). */
  createWidget(pageId: string, item: LayoutItem): void {
    if (!isTemporaryId(item.id)) return;
    this.saveQueue.enqueue({
      op: 'createWidget',
      ref: item.id,
      pageId: Number(pageId),
      type: item.type,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      props: toApiProps(item.props ?? {}),
      ...parentForCreate(item.parentId),
    });
  }

  /**
   * Add new widgets (with temporary ids, children inside) to the page, and save them: e.g. pasted
   * copies. Each goes into its parent's children, or onto the page.
   */
  addWidgets(pageId: string, items: LayoutItem[]): void {
    this.insert(pageId, items);
    for (const item of flattenTree(items)) this.createWidget(pageId, item);
  }

  // ---- For undo and redo (editor/commands): change the layout and save it ----

  /** Puts widgets in these places (position, size and container). */
  placeWidgets(pageId: string, places: LayoutItem[]): void {
    let layout = this.getLayout(pageId);
    for (const place of places) {
      const item = place.id != null ? findInTree(layout, place.id) : null;
      if (!item || place.id == null) continue;
      layout = insertIntoTree(removeFromTree(layout, [place.id]),
        { ...item, x: place.x, y: place.y, w: place.w, h: place.h, parentId: place.parentId });
    }
    this.layouts.update((all) => ({ ...all, [pageId]: layout }));
    places.forEach((place) => this.saveWidgetPlace(place));
  }

  /** Deletes widgets (with what's inside them). */
  removeWidgets(pageId: string, ids: ComponentId[]): void {
    this.layouts.update((all) => ({ ...all, [pageId]: removeFromTree(this.getLayout(pageId), ids) }));
    ids.forEach((id) => this.deleteWidget(id));
  }

  /** Brings back deleted widgets, as they were (with what was inside them), by their ids. */
  restoreWidgets(pageId: string, items: LayoutItem[]): void {
    this.insert(pageId, items);
    items.forEach((item) => item.id != null && this.saveQueue.enqueue({ op: 'restoreWidget', ...target(item.id) }));
  }

  private insert(pageId: string, items: LayoutItem[]): void {
    let layout = this.getLayout(pageId);
    for (const item of items) layout = insertIntoTree(layout, item);
    this.layouts.update((all) => ({ ...all, [pageId]: layout }));
  }

  /** Delete a widget (and what's inside it); it can be restored for a while (soft delete). */
  deleteWidget(id: ComponentId): void {
    this.saveQueue.enqueue({ op: 'deleteWidget', ...target(id) });
  }

  /** Edit a widget's props: shown right away, saved with the next batch. */
  patchItemProps(pageId: string, id: ComponentId, props: WidgetProps): void {
    const saved = this.setItemProps(pageId, id, (current) => ({ ...current, ...props }));
    if (saved) this.saveQueue.enqueue({ op: 'updateWidget', ...target(id), props: toApiProps(saved) });
  }

  /** Set a widget's props as a whole (undo/redo of edits): shown right away, saved with the next batch. */
  replaceItemProps(pageId: string, id: ComponentId, props: WidgetProps): void {
    if (this.setItemProps(pageId, id, () => ({ ...props }))) {
      this.saveQueue.enqueue({ op: 'updateWidget', ...target(id), props: toApiProps(props) });
    }
  }

  /**
   * Complete a new widget's props with its type's defaults (as loading a page does for stored ones),
   * without saving anything. Values already there win.
   */
  applyTypeDefaults(pageId: string, id: ComponentId, type: string | undefined): void {
    const widget = catalogWidget(type);
    if (!widget) return;
    this.setItemProps(pageId, id, (current) => ({ ...catalogDefaults(widget), ...current }));
  }

  /**
   * Show temporary props on the live widget only (workflow preview). Layout state and the
   * database are untouched; `null` restores the item's own props.
   */
  previewItemProps(pageId: string, id: ComponentId, patch: WidgetProps | null): void {
    const item = findInTree(this.getLayout(pageId), id);
    if (!item) return;
    const props = { ...item.props };
    this.propPatch$.next({ id: id.toString(), props: patch ? { ...props, ...patch } : props });
  }

  /** The props now set (null when there's no such widget). */
  private setItemProps(pageId: string, id: ComponentId, compute: (current: WidgetProps) => WidgetProps): WidgetProps | null {
    const layout = this.layouts()[pageId];
    const item = layout ? findInTree(layout, id) : null;
    if (!layout || !item) return null;

    const props = compute(item.props ?? {});
    this.layouts.update((all) => ({ ...all, [pageId]: updateInTree(layout, id, (it) => ({ ...it, props })) }));
    this.propPatch$.next({ id: id.toString(), props });
    return props;
  }

  /** New widgets were saved: they go by their real ids from now on. */
  private adoptSavedIds(ids: ReadonlyMap<string, number>): void {
    const swap = (id: ComponentId | undefined): ComponentId | undefined =>
      typeof id === 'string' && ids.has(id) ? ids.get(id) : id;
    const rename = (items: LayoutItem[]): LayoutItem[] =>
      items.map((item) => ({
        ...item,
        id: swap(item.id),
        parentId: swap(item.parentId),
        children: item.children ? rename(item.children) : item.children,
      }));
    this.layouts.update((all) => Object.fromEntries(Object.entries(all).map(([page, items]) => [page, rename(items)])));
  }
}

/** How a change names a widget: by id once saved, else by its temporary id. */
function target(id: ComponentId): Pick<ChangeOperation, 'id' | 'ref'> {
  return typeof id === 'number' ? { id } : { ref: id };
}

/** A widget's container, or -1: on the page itself. */
function parent(parentId: ComponentId | undefined): Pick<ChangeOperation, 'parentId' | 'parentRef'> {
  if (parentId == null) return { parentId: -1 };
  return typeof parentId === 'number' ? { parentId } : { parentRef: parentId };
}

function parentForCreate(parentId: ComponentId | undefined): Pick<ChangeOperation, 'parentId' | 'parentRef'> {
  return parentId == null ? {} : parent(parentId);
}
