import { Injectable, computed, inject, signal } from '@angular/core';
import { LayoutStateService } from './layout-state.service';
import { TabsService } from './tabs.service';
import { IdRegistry } from './id-registry.service';
import { HistoryService } from '../editor/commands/history.service';
import { SetWidgetProps } from '../editor/commands/props-commands';
import { findInTree } from '../_utils/layout-tree.utils';
import { WidgetProps } from '../_types/layout.types';

/** The widgets selected on the canvas (or in Layers), whose props the properties panel edits. */
@Injectable({ providedIn: 'root' })
export class SelectionService {
  private readonly layoutState = inject(LayoutStateService);
  private readonly tabs = inject(TabsService);
  private readonly history = inject(HistoryService);

  /** In the order they were selected. */
  readonly selectedIds = signal<string[]>([]);
  /** The one selected last (null: none). */
  readonly selectedId = computed(() => this.selectedIds().at(-1) ?? null);

  constructor() {
    // A selected new widget was saved: it's selected by its real id now
    inject(IdRegistry).mapped$.subscribe((ids) =>
      this.selectedIds.update((selected) => selected.map((id) => (ids.has(id) ? String(ids.get(id)) : id))));
  }

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

  /** Edit a widget's props (the one selected last, by default); saved with the next batch, and undoable. */
  updateProps(props: WidgetProps, id: string | null = this.selectedId()): void {
    const tabId = this.tabs.activeTabId();
    if (!id || !tabId) return;
    const before = { ...(findInTree(this.layoutState.getLayout(tabId), id)?.props ?? {}) };
    this.layoutState.patchItemProps(tabId, id, props);
    const after = { ...(findInTree(this.layoutState.getLayout(tabId), id)?.props ?? {}) };
    if (JSON.stringify(before) !== JSON.stringify(after)) this.history.record(new SetWidgetProps(tabId, id, before, after));
  }
}
