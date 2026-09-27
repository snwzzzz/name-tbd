import { Injectable } from '@angular/core';

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
  providedIn: 'root'
})
export class LayoutStateService {
  private readonly STORAGE_KEY = 'ide-layout-state';

  getLayout(tabId: string): LayoutItem[] {
    const raw = sessionStorage.getItem(`${this.STORAGE_KEY}-${tabId}`);
    return raw ? JSON.parse(raw) : [];
  }

  saveLayout(tabId: string, layout: LayoutItem[]): void {
    sessionStorage.setItem(`${this.STORAGE_KEY}-${tabId}`, JSON.stringify(layout));
  }
}
