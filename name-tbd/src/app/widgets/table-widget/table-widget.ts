import { Component, computed, effect, inject } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { DataSourceStateService } from '../../_services/data-source-state.service';
import { propBool, propNumber } from '../../_utils/widget-props.utils';
import { parseColumnList, visibleColumnIndexes } from '../../_utils/table.utils';

export const TABLE_DEFAULT_MAX_ROWS = 10;
const MAX_ROWS_LIMIT = 1000;

/** Shows (some columns of) a data source's rows. The export draws it the same way (TableRenderer.java). */
@Component({
  selector: 'app-table-widget',
  templateUrl: './table-widget.html',
  styleUrl: './table-widget.scss',
})
export class TableWidget extends BaseWidget {
  private readonly state = inject(DataSourceStateService);

  readonly title = computed(() => this.text('title'));
  readonly showHeader = computed(() => propBool(this.props(), 'showHeader', true));
  readonly striped = computed(() => propBool(this.props(), 'striped', false));
  private readonly maxRows = computed(() =>
    Math.min(MAX_ROWS_LIMIT, Math.max(0, Math.floor(propNumber(this.props(), 'maxRows', TABLE_DEFAULT_MAX_ROWS)))),
  );

  readonly dataSourceId = computed(() => {
    const id = propNumber(this.props(), 'dataSourceId', NaN);
    return Number.isInteger(id) ? id : null;
  });
  /** The data source with its rows; null until loaded (or when there is none). */
  readonly source = computed(() => {
    const id = this.dataSourceId();
    return id === null ? null : (this.state.details()[id] ?? null);
  });
  /** Whether the data source can't be shown (deleted, or failed to load). */
  readonly missing = computed(() => {
    const id = this.dataSourceId();
    return id !== null && !this.source() && this.state.loaded() && !this.state.sources().some((s) => s.id === id);
  });

  private readonly columnIndexes = computed(() => {
    const columns = this.source()?.columns ?? [];
    return visibleColumnIndexes(columns, parseColumnList(this.props()['columns']));
  });
  readonly headers = computed(() => this.columnIndexes().map((i) => this.source()?.columns?.[i] ?? ''));
  readonly rows = computed(() =>
    (this.source()?.rows ?? []).slice(0, this.maxRows()).map((row) => this.columnIndexes().map((i) => row[i] ?? '')),
  );
  readonly hiddenRowCount = computed(() => (this.source()?.rows?.length ?? 0) - this.rows().length);

  constructor() {
    super();
    this.state.ensureLoaded();
    effect(() => {
      const id = this.dataSourceId();
      if (id !== null && this.state.sources().some((s) => s.id === id)) this.state.ensureDetails(id);
    });
  }
}
