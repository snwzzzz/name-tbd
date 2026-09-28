import { Injectable, signal, inject } from '@angular/core';
import { of, Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { UiComponentControllerService } from '../api/services/uiComponentController.service';
import { PageControllerService } from '../api/services/pageController.service';

export interface LayoutItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  props?: any;
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
        const layout: LayoutItem[] = dtos.map((dto: any) => ({
          id: dto.id!.toString(),
          type: dto.type!,
          x: dto.x || 0,
          y: dto.y || 0,
          w: dto.w || 100,
          h: dto.h || 40,
          props: dto.props || {},
        }));
        this.layouts.update((l) => ({ ...l, [pageId]: layout }));
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
    if (item.id.startsWith('new-') || item.id.startsWith('item-')) return of(null);

    return this.uiService.updateComponent(Number(item.id), {
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      props: item.props || {},
    });
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
    });
  }
}
