import { Component, computed, effect, inject, input, output } from '@angular/core';
import { LucideTrash2 } from '@lucide/angular';
import { DataSourceStateService } from '../../_services/data-source-state.service';
import { DataSourceDto, DataSourceSummaryDto } from '../../api/models';
import { describeColumns } from '../../_utils/data-source.utils';

/** One data source: its key figures, and all of its rows under columns labeled with their types. */
@Component({
  selector: 'app-data-manager-detail',
  imports: [LucideTrash2],
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

  /** The key figures at the top. */
  readonly stats = computed(() => {
    const cells = this.columns().length * this.rows().length;
    const filled = this.columnInfo().reduce((sum, column) => sum + column.filledCount, 0);
    return [
      { label: 'Rows', value: String(this.rows().length) },
      { label: 'Columns', value: String(this.columns().length) },
      { label: 'Complete', value: `${cells === 0 ? 0 : Math.round((filled / cells) * 100)}%` },
      { label: 'Empty cells', value: String(cells - filled) },
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
