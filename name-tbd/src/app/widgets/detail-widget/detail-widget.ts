import { Component, computed, effect, inject } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { DetailRecordsService } from '../../core/services/detail-records.service';
import { APP_DATA, APP_SESSION } from '../../core/ports/app-ports';
import { propNumber } from '../../_utils/widget-props.utils';
import { cellText } from '../../core/forms/file-value';
import { parseColumnList, visibleColumnIndexes } from '../../_utils/table.utils';

export const DETAIL_DEFAULT_EMPTY_TEXT = 'Nothing selected yet.';

interface DetailField {
  label: string;
  value: string;
}

/**
 * One row as label/value pairs, sent here by a workflow's "Show row in detail" action (from this
 * page or another one). While editing it shows its fields without values.
 */
@Component({
  selector: 'app-detail-widget',
  templateUrl: './detail-widget.html',
  styleUrl: './detail-widget.scss',
})
export class DetailWidget extends BaseWidget {
  private readonly appData = inject(APP_DATA);
  private readonly records = inject(DetailRecordsService);
  readonly previewing = inject(APP_SESSION).live;

  readonly title = computed(() => this.text('title'));
  readonly emptyText = computed(() => this.text('emptyText') ?? DETAIL_DEFAULT_EMPTY_TEXT);
  private readonly chosenFields = computed(() => parseColumnList(this.props()['columns']));

  /** The fields of its own data source, to show while editing (null: none picked). */
  private readonly configuredColumns = computed(() => {
    const id = propNumber(this.props(), 'dataSourceId', NaN);
    if (!Number.isInteger(id)) return null;
    return this.appData.sources().find((s) => s.id === id)?.columns ?? null;
  });

  /** The row sent here while the app runs, with its data source's columns (null: none, or it was deleted). */
  private readonly shownRow = computed(() => {
    const ref = this.records.record(this.id());
    if (!ref) return null;
    const table = this.appData.table(ref.dataSourceId);
    const row = table?.rows.find((r) => r.id === ref.rowId);
    return table && row ? { columns: table.columns, values: row.values } : null;
  });
  readonly rowDeleted = computed(() => !!this.records.record(this.id()) && !this.shownRow());

  /** The fields to show: the chosen ones in their order (all when none are chosen). */
  readonly fields = computed<DetailField[]>(() => {
    const row = this.previewing() ? this.shownRow() : null;
    const columns = row?.columns ?? (this.previewing() ? [] : (this.configuredColumns() ?? []));
    return visibleColumnIndexes(columns, this.chosenFields()).map((i) => ({
      label: columns[i],
      value: row ? cellText(row.values[i]) : '',
    }));
  });

  constructor() {
    super();
    // The shown row's data, if it isn't loaded yet (e.g. after going on to another page)
    effect(() => {
      const ref = this.records.record(this.id());
      if (ref) this.appData.ensureTable(ref.dataSourceId);
    });
  }
}
