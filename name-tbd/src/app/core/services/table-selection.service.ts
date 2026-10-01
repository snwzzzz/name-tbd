import { Injectable, signal } from '@angular/core';

/** The rows selected in each data table (by the table's component id) while a page is previewed. */
@Injectable({ providedIn: 'root' })
export class TableSelectionService {
  private readonly selections = signal<Record<string, string[]>>({});

  selected(tableId: string): string[] {
    return this.selections()[tableId] ?? [];
  }

  /**
   * Clicking a row: with multi-select it's added or removed; otherwise it becomes the only
   * selected row (or nothing, when it was already selected).
   */
  toggle(tableId: string, rowId: string, multiSelect: boolean): void {
    const current = this.selected(tableId);
    const isSelected = current.includes(rowId);
    const next = multiSelect
      ? (isSelected ? current.filter((id) => id !== rowId) : [...current, rowId])
      : (isSelected && current.length === 1 ? [] : [rowId]);
    this.selections.update((all) => ({ ...all, [tableId]: next }));
  }

  /** Makes sure the row is selected (the only one, without multi-select); e.g. for a double-click. */
  ensureSelected(tableId: string, rowId: string, multiSelect: boolean): void {
    const current = this.selected(tableId);
    const next = multiSelect ? (current.includes(rowId) ? current : [...current, rowId]) : [rowId];
    this.selections.update((all) => ({ ...all, [tableId]: next }));
  }

  /** Forget rows that no longer exist (e.g. after deleting them). */
  deselect(tableId: string, rowIds: string[]): void {
    this.selections.update((all) => ({ ...all, [tableId]: this.selected(tableId).filter((id) => !rowIds.includes(id)) }));
  }

  reset(): void {
    this.selections.set({});
  }
}
