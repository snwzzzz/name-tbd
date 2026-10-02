import { Injectable, computed, inject, signal } from '@angular/core';
import { LayoutStateService } from './layout-state.service';
import { TabsService } from './tabs.service';
import { PropsAutosaveService } from './props-autosave.service';
import { WidgetProps } from '../_types/layout.types';

/** The widgets selected on the canvas (or in Layers), whose props the properties panel edits. */
@Injectable({ providedIn: 'root' })
export class SelectionService {
  private readonly layoutState = inject(LayoutStateService);
  private readonly tabs = inject(TabsService);
  private readonly autosave = inject(PropsAutosaveService);

  /** In the order they were selected. */
  readonly selectedIds = signal<string[]>([]);
  /** The one selected last (null: none). */
  readonly selectedId = computed(() => this.selectedIds().at(-1) ?? null);

  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  /** Selects just this widget. */
  select(id: string): void {
    this.selectedIds.set([id]);
  }

  /** Ctrl/⌘/Shift+click: adds the widget to the selection, or takes it out. */
  toggle(id: string): void {
    this.selectedIds.update((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }

  selectMany(ids: string[]): void {
    this.selectedIds.set([...new Set(ids)]);
  }

  clear(): void {
    this.selectedIds.set([]);
  }

  /** Edit a widget's props (the one selected last, by default); they're saved shortly after the edits pause. */
  updateProps(props: WidgetProps, id: string | null = this.selectedId()): void {
    const tabId = this.tabs.activeTabId();
    if (!id || !tabId) return;
    this.layoutState.patchItemProps(tabId, id, props);
    this.autosave.schedule(tabId, id);
  }
}
