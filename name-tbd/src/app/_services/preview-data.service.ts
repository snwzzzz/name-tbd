import { Injectable, inject, signal } from '@angular/core';
import { DataSourceStateService } from './data-source-state.service';
import { TableData } from '../_types/data-source.types';
import { toTableData } from '../_utils/table.utils';

/**
 * Data sources as a page preview sees them. The first change to a data source makes a copy that
 * all later reads and changes use; the real data is never touched. reset() drops the copies.
 * With `writeThrough` on, the preview changes the real data instead (EditorAppData sends the changes
 * to the data API), e.g. to try an app on a live spreadsheet.
 */
@Injectable({ providedIn: 'root' })
export class PreviewDataService {
  private readonly state = inject(DataSourceStateService);

  private readonly copies = signal<Record<number, TableData>>({});
  /** Whether previews change the real data (not a copy). Kept while the editor is open. */
  readonly writeThrough = signal(false);
  private nextRowNumber = 0;

  /** The data source's copy if it was changed, else its real data (null until that's loaded). */
  table(dataSourceId: number): TableData | null {
    const copy = this.copies()[dataSourceId];
    if (copy) return copy;
    const source = this.state.details()[dataSourceId];
    return source ? toTableData(source) : null;
  }

  addRow(dataSourceId: number, values: string[]): void {
    this.change(dataSourceId, (table) => ({
      ...table,
      rows: [...table.rows, { id: `new-${++this.nextRowNumber}`, values }],
    }));
  }

  updateRow(dataSourceId: number, rowId: string, values: string[]): void {
    this.change(dataSourceId, (table) => ({
      ...table,
      rows: table.rows.map((row) => (row.id === rowId ? { ...row, values } : row)),
    }));
  }

  deleteRows(dataSourceId: number, rowIds: string[]): void {
    this.change(dataSourceId, (table) => ({ ...table, rows: table.rows.filter((row) => !rowIds.includes(row.id)) }));
  }

  reset(): void {
    this.copies.set({});
  }

  private change(dataSourceId: number, update: (table: TableData) => TableData): void {
    const table = this.table(dataSourceId);
    if (!table) throw new Error(`Data source ${dataSourceId} isn't loaded`);
    this.copies.update((all) => ({ ...all, [dataSourceId]: update(table) }));
  }
}
