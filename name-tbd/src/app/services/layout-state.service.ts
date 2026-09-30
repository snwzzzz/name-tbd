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

  updateComponent(pageId: string, item: LayoutItem): Observable<any> {
    if (!item.id || typeof item.id === 'string') {
      return of(null);
    }

    // Always read the freshest version of this item from the signal so we
    // never send stale (or missing) props from a closure captured earlier.
    const liveItem = this.findById(pageId, item.id) ?? item;

    return this.uiService.updateComponent(item.id, {
      x: liveItem.x,
      y: liveItem.y,
      w: liveItem.w,
      h: liveItem.h,
      props: liveItem.props || {},
      parentId: liveItem.parentId || -1,
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

  private saveTimeouts = new Map<string | number, any>();
  /** Stores {pageId, node} so flushPendingSaves can fire the PUT immediately. */
  private pendingSaves = new Map<string | number, { pageId: string; node: any }>();

  patchItemProps(pageId: string, id: string | number, props: any) {
    const layout = this.layouts()[pageId];
    if (!layout) return;

    const updatedLayout = JSON.parse(JSON.stringify(layout));
    
    const updateInTree = (nodes: any[]): any => {
      for (const node of nodes) {
        if (node.id === id || node.id?.toString() === id?.toString()) {
          node.props = { ...node.props, ...props };
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
      
      // Sync to backend with debounce to prevent spamming PUT requests on every keystroke
      if (typeof targetNode.id === 'number') {
        if (this.saveTimeouts.has(targetNode.id)) {
          clearTimeout(this.saveTimeouts.get(targetNode.id));
        }
        
        this.pendingSaves.set(targetNode.id, { pageId, node: targetNode });

        const timeoutId = setTimeout(() => {
          this.updateComponent(pageId, targetNode).subscribe({
            error: (err) => console.error('[DEBUG] Failed to save props:', err)
          });
          this.saveTimeouts.delete(targetNode.id as number);
          this.pendingSaves.delete(targetNode.id as number);
        }, 500);
        
        this.saveTimeouts.set(targetNode.id, timeoutId);
      }
    }
  }

  /** Immediately flush all pending debounced prop saves (call on deselect / tab switch). */
  flushPendingSaves() {
    this.saveTimeouts.forEach((timeoutId, id) => {
      clearTimeout(timeoutId);
      const pending = this.pendingSaves.get(id);
      if (pending) {
        this.updateComponent(pending.pageId, pending.node).subscribe({
          error: (err) => console.error('[DEBUG] Failed to flush save:', err)
        });
      }
    });
    this.saveTimeouts.clear();
    this.pendingSaves.clear();
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
