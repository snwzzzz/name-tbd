import { Injectable, signal, inject } from '@angular/core';
import { of, Observable, Subject } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { UiComponentControllerService } from '../api/services/uiComponentController.service';
import { PageControllerService } from '../api/services/pageController.service';

import { UiComponentDto } from '../api/models';

export interface LayoutItem extends Omit<UiComponentDto, 'id' | 'parentId'> {
  id?: number | string;
  parentId?: number | string;
  children?: LayoutItem[];
}

@Injectable({
  providedIn: 'root',
})
export class LayoutStateService {
  private uiService = inject(UiComponentControllerService);
  private pageService = inject(PageControllerService);

  private layouts = signal<Record<string, LayoutItem[]>>({});

  /** Emits whenever a prop is patched so the canvas can update the live widget. */
  readonly propPatch$ = new Subject<{ id: string; props: Record<string, any> }>();

  loadLayoutForTab(pageId: string) {
    if (this.layouts()[pageId]) {
      return of(this.layouts()[pageId]);
    }
    return this.pageService.getComponents1(Number(pageId)).pipe(
      tap((data: any) => {
        const dtos = Array.isArray(data) ? data : [];
        const layout: LayoutItem[] = dtos.map((dto: any) => ({ ...dto }));

        // Reconstruct hierarchy
        const map = new Map<number | string, LayoutItem>();
        layout.forEach((item) => {
          if (item.id) map.set(item.id, item);
        });
        const roots: LayoutItem[] = [];
        layout.forEach((item) => {
          if (item.parentId && map.has(item.parentId)) {
            const parent = map.get(item.parentId)!;
            if (!parent.children) parent.children = [];
            parent.children.push(item);
          } else {
            roots.push(item);
          }
        });

        this.layouts.update((l) => ({ ...l, [pageId]: roots }));
      }),
      map(() => this.layouts()[pageId]),
    );
  }

  getLayout(pageId: string): LayoutItem[] {
    return this.layouts()[pageId] || [];
  }

  /**
   * Persist the grid layout (positions/sizes) while keeping any props that
   * are already stored in the current layout signal.  GridStack sync events
   * only know about geometry — they have no props — so a naive replace would
   * silently wipe every prop value the user has set.
   */
  saveLayout(pageId: string, incoming: LayoutItem[]): void {
    const existing = this.layouts()[pageId] || [];

    // Build a flat id→props map from the current layout tree
    const propsById = new Map<string, any>();
    const collectProps = (nodes: LayoutItem[]) => {
      for (const n of nodes) {
        if (n.id != null && n.props != null) {
          propsById.set(n.id.toString(), n.props);
        }
        if (n.children) collectProps(n.children);
      }
    };
    collectProps(existing);

    // Re-attach props to the incoming (geometry-only) layout
    const mergeProps = (nodes: LayoutItem[]): LayoutItem[] =>
      nodes.map(n => ({
        ...n,
        props: propsById.get(n.id?.toString() ?? '') ?? n.props,
        children: n.children ? mergeProps(n.children) : n.children,
      }));

    this.layouts.update((l) => ({ ...l, [pageId]: mergeProps(incoming) }));
  }

  /**
   * Persist an item's geometry. Props are only sent when `includeProps` is set
   * (the explicit Save in the properties panel) — otherwise the backend keeps
   * the stored props, so moving a widget never saves unsaved prop edits.
   */
  updateComponent(pageId: string, item: LayoutItem, includeProps = false): Observable<any> {
    if (!item.id || typeof item.id === 'string') {
      return of(null);
    }

    // Geometry comes from the caller: the canvas passes the node's new position
    // before the layout signal has been updated (saveLayout runs after the diff).
    // Props are read from the signal, which holds the latest edits.
    const liveItem = this.findById(pageId, item.id) ?? item;

    return this.uiService.updateComponent(item.id, {
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      props: includeProps ? liveItem.props || {} : undefined,
      parentId: item.parentId || -1,
    } as any);
  }

  /** Walk the layout tree and return the item with the given id, or null. */
  private findById(pageId: string, id: number | string): LayoutItem | null {
    const search = (nodes: LayoutItem[]): LayoutItem | null => {
      for (const n of nodes) {
        if (n.id?.toString() === id.toString()) return n;
        if (n.children) {
          const found = search(n.children);
          if (found) return found;
        }
      }
      return null;
    };
    return search(this.layouts()[pageId] || []);
  }

  deleteComponent(id: number | string): Observable<any> {
    if (typeof id === 'string') return of(null);
    return this.uiService.deleteComponent(id);
  }

  /**
   * Fetch the props of a placed component (type defaults overlaid with its
   * stored values) and apply them to the layout and the live widget.
   * Nothing is written back — this only mirrors what the backend resolved.
   */
  loadComponentProps(pageId: string, id: number): void {
    this.uiService.getComponentProps(id).subscribe({
      // Local values win so an edit made while the request was in flight is not reverted
      next: (props) => this.setItemProps(pageId, id, (current) => ({ ...props, ...current })),
      error: (err) => console.error(`Failed to load props for component ${id}:`, err),
    });
  }

  /** Recompute the props of one item in the layout tree and notify the canvas. Returns the updated node. */
  private setItemProps(pageId: string, id: string | number, compute: (current: any) => any): any {
    const layout = this.layouts()[pageId];
    if (!layout) return null;

    const updatedLayout = JSON.parse(JSON.stringify(layout));

    const updateInTree = (nodes: any[]): any => {
      for (const node of nodes) {
        if (node.id === id || node.id?.toString() === id?.toString()) {
          node.props = compute(node.props);
          return node;
        }
        if (node.children) {
          const found: any = updateInTree(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const targetNode = updateInTree(updatedLayout);
    if (targetNode) {
      // Update local UI state immediately for responsiveness
      this.layouts.update((l) => ({ ...l, [pageId]: updatedLayout }));

      // Notify canvas so the live widget re-renders its props
      this.propPatch$.next({ id: targetNode.id?.toString(), props: targetNode.props });
    }
    return targetNode;
  }

  /**
   * Show temporary props on the live widget only (workflow preview). Layout
   * state and the database are untouched; `null` restores the item's own props.
   */
  previewItemProps(pageId: string, id: string | number, patch: Record<string, any> | null): void {
    const item = this.findById(pageId, id);
    if (!item) return;
    const props = { ...(item.props as Record<string, any> | undefined) };
    this.propPatch$.next({ id: id.toString(), props: patch ? { ...props, ...patch } : props });
  }

  /**
   * Apply prop edits locally (layout state + live widget) only.
   * They reach the database when the user presses Save in the properties panel.
   */
  patchItemProps(pageId: string, id: string | number, props: any) {
    this.setItemProps(pageId, id, (current) => ({ ...current, ...props }));
  }

  addComponent(pageId: string, item: LayoutItem) {
    return this.uiService.createComponent({
      pageId: Number(pageId),
      type: item.type,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      props: item.props || {},
      parentId: item.parentId && !isNaN(Number(item.parentId)) ? Number(item.parentId) : undefined,
    });
  }
}
