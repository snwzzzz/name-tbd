import { Injectable, signal } from '@angular/core';

/** A row of a data source, by reference (so a detail shows its current values). */
export interface RecordRef {
  dataSourceId: number;
  rowId: string;
}

/**
 * Which row each detail section shows (by the section's component id) while a page is previewed.
 * Set by the "Show row in detail" action; kept when a preview goes on to another page.
 */
@Injectable({ providedIn: 'root' })
export class DetailRecordsService {
  private readonly records = signal<Record<string, RecordRef>>({});

  record(detailId: string): RecordRef | null {
    return this.records()[detailId] ?? null;
  }

  show(detailId: string, ref: RecordRef): void {
    this.records.update((all) => ({ ...all, [detailId]: ref }));
  }

  reset(): void {
    this.records.set({});
  }
}
