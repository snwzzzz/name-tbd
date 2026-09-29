import { Injectable, signal, inject } from '@angular/core';
import { LayoutStateService } from './layout-state.service';
import { TabsService } from './tabs.service';

@Injectable({ providedIn: 'root' })
export class SelectionService {
  layoutState = inject(LayoutStateService);
  tabs = inject(TabsService);

  selectedId = signal<string | null>(null);

  select(id: string) {
    this.selectedId.set(id);
  }

  clear() {
    this.selectedId.set(null);
  }

  updateProps(newProps: Record<string, any>) {
    const id = this.selectedId();
    const tabId = this.tabs.activeTabId();
    if (!id || !tabId) return;

    // Send update to the backend
    this.layoutState.updateComponent(tabId, { id: Number(id), props: newProps } as any).subscribe();
  }
}
