import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { UiComponentControllerService } from '../api/services/uiComponentController.service';
import { PageControllerService } from '../api/services/pageController.service';
import { UiComponentDto } from '../api/models';
import { ComponentId, LayoutItem, PropPatch, WidgetProps } from '../_types/layout.types';
import { isSavedId, toComponentId } from '../_utils/component-id.utils';
import { buildLayoutTree, findInTree, updateInTree } from '../_utils/layout-tree.utils';
import { toApiParentId, toApiProps, toLayoutItem } from '../_utils/api-mapper.utils';

/** The widgets of each page (by page id = editor tab id), and their persistence. */
@Injectable({ providedIn: 'root' })
export class LayoutStateService {
  private readonly uiService = inject(UiComponentControllerService);
  private readonly pageService = inject(PageControllerService);

  private readonly layouts = signal<Record<string, LayoutItem[]>>({});

  /** Emits whenever a widget's props change, so the canvas can update the live widget. */
  readonly propPatch$ = new Subject<PropPatch>();

  /** Load a page's widgets once; later calls get the cached layout. */
  loadLayoutForTab(pageId: string): Observable<LayoutItem[]> {
    const cached = this.layouts()[pageId];
    if (cached) return of(cached);

    return this.pageService.getComponents1(Number(pageId)).pipe(
      map((dtos) => buildLayoutTree((Array.isArray(dtos) ? dtos : []).map(toLayoutItem))),
      tap((layout) => this.layouts.update((all) => ({ ...all, [pageId]: layout }))),
    );
  }

  /**
   * Load a page's widgets again (e.g. after widgets were created for it). Props edited here and
   * not saved yet win over the loaded ones, so nothing typed is lost.
   */
  refreshLayout(pageId: string): Observable<LayoutItem[]> {
    return this.pageService.getComponents1(Number(pageId)).pipe(
      map((dtos) => buildLayoutTree((Array.isArray(dtos) ? dtos : []).map(toLayoutItem))),
      map((loaded) => {
        const current = this.getLayout(pageId);
        const withLocalProps = (items: LayoutItem[]): LayoutItem[] =>
          items.map((item) => {
            const local = item.id != null ? findInTree(current, item.id)?.props : undefined;
            return {
              ...item,
              props: local ? { ...item.props, ...local } : item.props,
              children: item.children ? withLocalProps(item.children) : item.children,
            };
          });
        return withLocalProps(loaded);
      }),
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

  /**
   * Persist an item's geometry. Props are only sent when `includeProps` is set (the explicit
   * Save in the properties panel), so moving a widget never saves unsaved prop edits.
   */
  updateComponent(pageId: string, item: LayoutItem, includeProps = false): Observable<UiComponentDto | null> {
    if (!isSavedId(item.id)) return of(null);

    // Geometry comes from the caller (the canvas passes the new position before the layout
    // signal is updated); props come from the signal, which holds the latest edits.
    const props = (findInTree(this.getLayout(pageId), item.id) ?? item).props ?? {};

    return this.uiService.updateComponent(item.id, {
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      props: includeProps ? toApiProps(props) : undefined,
      parentId: toApiParentId(item.parentId),
    });
  }

  addComponent(pageId: string, item: LayoutItem): Observable<UiComponentDto> {
    const parentId = toComponentId(item.parentId);
    return this.uiService.createComponent({
      pageId: Number(pageId),
      type: item.type,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      props: toApiProps(item.props ?? {}),
      parentId: isSavedId(parentId) ? parentId : undefined,
    });
  }

  deleteComponent(id: ComponentId): Observable<void> {
    if (!isSavedId(id)) return of(undefined);
    return this.uiService.deleteComponent(id).pipe(map(() => undefined));
  }

  /**
   * Fetch the props of a placed component (type defaults overlaid with its stored values)
   * and apply them to the layout and the live widget. Nothing is written back.
   */
  loadComponentProps(pageId: string, id: number): void {
    this.uiService.getComponentProps(id).subscribe({
      // Local values win, so an edit made while the request was in flight isn't reverted
      next: (props: WidgetProps) => this.setItemProps(pageId, id, (current) => ({ ...props, ...current })),
      error: (err) => console.error(`Failed to load props for component ${id}:`, err),
    });
  }

  /** Apply prop edits locally; they reach the database when the user presses Save. */
  patchItemProps(pageId: string, id: ComponentId, props: WidgetProps): void {
    this.setItemProps(pageId, id, (current) => ({ ...current, ...props }));
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

  private setItemProps(pageId: string, id: ComponentId, compute: (current: WidgetProps) => WidgetProps): void {
    const layout = this.layouts()[pageId];
    const item = layout ? findInTree(layout, id) : null;
    if (!layout || !item) return;

    const props = compute(item.props ?? {});
    this.layouts.update((all) => ({ ...all, [pageId]: updateInTree(layout, id, (it) => ({ ...it, props })) }));
    this.propPatch$.next({ id: id.toString(), props });
  }
}
