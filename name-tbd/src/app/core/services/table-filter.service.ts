import { Injectable, signal } from '@angular/core';

/** The search each data table (by the table's component id) is filtered by while the app runs (see the search action). */
@Injectable({ providedIn: 'root' })
export class TableFilterService {
  private readonly queries = signal<Record<string, string>>({});

  query(tableId: string): string {
    return this.queries()[tableId] ?? '';
  }

  /** An empty query shows all rows again. */
  set(tableId: string, query: string): void {
    this.queries.update((all) => ({ ...all, [tableId]: query.trim() }));
  }

  reset(): void {
    this.queries.set({});
  }
}
