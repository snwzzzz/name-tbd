import { Injectable, signal, inject } from '@angular/core';
import { of, Observable } from 'rxjs';
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

  saveLayout(pageId: string, layout: LayoutItem[]): void {
    this.layouts.update((l) => ({ ...l, [pageId]: layout }));
  }

  updateComponent(pageId: string, item: LayoutItem): Observable<any> {
    // If it's a temp string ID, we can't update it yet in the DB.
    if (!item.id || typeof item.id === 'string') return of(null);

    return this.uiService.updateComponent(item.id, {
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      props: item.props || {},
      parentId: item.parentId || -1,
    } as any);
  }

  deleteComponent(id: number | string): Observable<any> {
    if (typeof id === 'string') return of(null);
    return this.uiService.deleteComponent(id);
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
