import { Component, computed, effect, inject, input, output } from '@angular/core';
import { LucideSheet, LucideTrash2 } from '@lucide/angular';
import { DataSourceStateService } from '../../_services/data-source-state.service';
import { DataSourceDto, DataSourceSummaryDto } from '../../api/models';
import { describeColumns } from '../../_utils/data-source.utils';

/** One data source as a dashboard: its numbers, its columns with their types, and all of its rows. */
@Component({
  selector: 'app-data-manager-detail',
  imports: [LucideSheet, LucideTrash2],
  templateUrl: './data-manager-detail.html',
  styleUrl: './data-manager-detail.scss',
})
export class DataManagerDetail {
  private readonly state = inject(DataSourceStateService);

  readonly id = input.required<number>();
  readonly deleteRequested = output<DataSourceSummaryDto>();

  readonly error = this.state.error;
  readonly source = computed<DataSourceDto | null>(() => this.state.details()[this.id()] ?? null);
  readonly columns = computed(() => this.source()?.columns ?? []);
  readonly rows = computed(() => this.source()?.rows ?? []);
  readonly columnInfo = computed(() => describeColumns(this.columns(), this.rows()));

  /** The numbers at the top, each in its own color. */
  readonly stats = computed(() => {
    const cells = this.columns().length * this.rows().length;
    const filled = this.columnInfo().reduce((sum, column) => sum + column.filledCount, 0);
    return [
      { label: 'Columns', value: String(this.columns().length), hue: 'blue' },
      { label: 'Rows', value: String(this.rows().length), hue: 'violet' },
      { label: 'Filled', value: `${cells === 0 ? 0 : Math.round((filled / cells) * 100)}%`, hue: 'teal' },
      { label: 'Empty cells', value: String(cells - filled), hue: 'amber' },
    ];
  });

  constructor() {
    effect(() => this.state.ensureDetails(this.id()));
  }

  requestDelete(): void {
    const source = this.source();
    if (source) this.deleteRequested.emit({ id: source.id, name: source.name });
  }
}
