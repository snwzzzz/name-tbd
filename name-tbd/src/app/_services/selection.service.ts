import { Injectable, inject, signal } from '@angular/core';
import { LayoutStateService } from './layout-state.service';
import { TabsService } from './tabs.service';
import { PropsAutosaveService } from './props-autosave.service';
import { WidgetProps } from '../_types/layout.types';

/** The widget selected on the canvas, whose props the properties panel edits. */
@Injectable({ providedIn: 'root' })
export class SelectionService {
  private readonly layoutState = inject(LayoutStateService);
  private readonly tabs = inject(TabsService);
  private readonly autosave = inject(PropsAutosaveService);

  readonly selectedId = signal<string | null>(null);

  select(id: string): void {
    this.selectedId.set(id);
  }

  clear(): void {
    this.selectedId.set(null);
  }

  /** Edit the selected widget's props; they're saved shortly after the edits pause. */
  updateProps(props: WidgetProps): void {
    const id = this.selectedId();
    const tabId = this.tabs.activeTabId();
    if (!id || !tabId) return;
    this.layoutState.patchItemProps(tabId, id, props);
    this.autosave.schedule(tabId, id);
  }
}
