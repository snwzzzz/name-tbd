import { Component, computed, effect, inject, input, output } from '@angular/core';
import { LucideChevronLeft, LucideTrash2 } from '@lucide/angular';
import { DataSourceStateService } from '../../_services/data-source-state.service';
import { DataSourceDto, DataSourceSummaryDto } from '../../api/models';
import { DATA_SOURCE_PREVIEW_ROWS } from '../../_constants/data-source.constants';
import { describeColumns } from '../../_utils/data-source.utils';

/** One data source in the sidebar: overview, per-column info, and a preview of its rows. */
@Component({
  selector: 'app-data-source-detail',
  imports: [LucideChevronLeft, LucideTrash2],
  templateUrl: './data-source-detail.html',
  styleUrl: './data-source-detail.scss',
})
export class DataSourceDetail {
  private readonly state = inject(DataSourceStateService);

  readonly id = input.required<number>();
  readonly back = output<void>();
  readonly deleteRequested = output<DataSourceSummaryDto>();

  readonly error = this.state.error;
  /** The data source with its rows, once loaded. */
  readonly source = computed<DataSourceDto | null>(() => this.state.details()[this.id()] ?? null);

  readonly columns = computed(() => this.source()?.columns ?? []);
  readonly rows = computed(() => this.source()?.rows ?? []);
  readonly columnInfo = computed(() => describeColumns(this.columns(), this.rows()));
  readonly filledPercent = computed(() => {
    const cells = this.columns().length * this.rows().length;
    const filled = this.columnInfo().reduce((sum, column) => sum + column.filledCount, 0);
    return cells === 0 ? 0 : Math.round((filled / cells) * 100);
  });

  readonly previewRows = computed(() => this.rows().slice(0, DATA_SOURCE_PREVIEW_ROWS));
  readonly hiddenRowCount = computed(() => this.rows().length - this.previewRows().length);

  constructor() {
    effect(() => this.state.ensureDetails(this.id()));
  }

  requestDelete(): void {
    const source = this.source();
    if (source) this.deleteRequested.emit({ id: source.id, name: source.name });
  }
}
