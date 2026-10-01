import { Component, computed, effect, inject } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { DataSourceStateService } from '../../_services/data-source-state.service';
import { PreviewDataService } from '../../_services/preview-data.service';
import { PreviewSessionService } from '../../_services/preview-session.service';
import { TableSelectionService } from '../../_services/table-selection.service';
import { WidgetEventsService } from '../../_services/widget-events.service';
import { ROW_DOUBLE_CLICK_EVENT } from '../../_constants/widget-events.constants';
import { TableData } from '../../_types/data-source.types';
import { propBool, propNumber } from '../../_utils/widget-props.utils';
import { parseColumnList, toTableData, visibleColumnIndexes } from '../../_utils/table.utils';

export const TABLE_DEFAULT_MAX_ROWS = 10;
const MAX_ROWS_LIMIT = 1000;

/**
 * Shows (some columns of) a data source's rows. While the page is previewed it shows the
 * preview's copy of the data, and rows can be selected by clicking them.
 * The export draws it the same way (TableRenderer.java).
 */
@Component({
  selector: 'app-table-widget',
  templateUrl: './table-widget.html',
  styleUrl: './table-widget.scss',
})
export class TableWidget extends BaseWidget {
  private readonly state = inject(DataSourceStateService);
  private readonly previewData = inject(PreviewDataService);
  private readonly selection = inject(TableSelectionService);
  private readonly widgetEvents = inject(WidgetEventsService);
  private readonly session = inject(PreviewSessionService);
  readonly previewing = this.session.active;

  readonly title = computed(() => this.text('title'));
  readonly showHeader = computed(() => propBool(this.props(), 'showHeader', true));
  readonly striped = computed(() => propBool(this.props(), 'striped', false));
  readonly multiSelect = computed(() => propBool(this.props(), 'multiSelect', false));
  private readonly maxRows = computed(() =>
    Math.min(MAX_ROWS_LIMIT, Math.max(0, Math.floor(propNumber(this.props(), 'maxRows', TABLE_DEFAULT_MAX_ROWS)))),
  );

  readonly dataSourceId = computed(() => {
    const id = propNumber(this.props(), 'dataSourceId', NaN);
    return Number.isInteger(id) ? id : null;
  });
  /** The rows to show: the preview's copy while previewing, else the real data; null until loaded. */
  readonly data = computed<TableData | null>(() => {
    const id = this.dataSourceId();
    if (id === null) return null;
    if (this.previewing()) return this.previewData.table(id);
    const source = this.state.details()[id];
    return source ? toTableData(source) : null;
  });
  /** Whether the data source can't be shown (deleted, or failed to load). */
  readonly missing = computed(() => {
    const id = this.dataSourceId();
    return id !== null && !this.data() && this.state.loaded() && !this.state.sources().some((s) => s.id === id);
  });

  private readonly columnIndexes = computed(() =>
    visibleColumnIndexes(this.data()?.columns ?? [], parseColumnList(this.props()['columns'])),
  );
  readonly headers = computed(() => this.columnIndexes().map((i) => this.data()?.columns[i] ?? ''));
  readonly rows = computed(() =>
    (this.data()?.rows ?? []).slice(0, this.maxRows()).map((row) => ({
      id: row.id,
      values: this.columnIndexes().map((i) => row.values[i] ?? ''),
    })),
  );
  readonly hiddenRowCount = computed(() => (this.data()?.rows.length ?? 0) - this.rows().length);
  readonly selectedIds = computed(() => new Set(this.selection.selected(this.id())));

  constructor() {
    super();
    this.state.ensureLoaded();
    effect(() => {
      const id = this.dataSourceId();
      if (id !== null && this.state.sources().some((s) => s.id === id)) this.state.ensureDetails(id);
    });
  }

  /** Rows are only selectable while the page is previewed (when editing, clicks select the widget). */
  onRowClick(rowId: string): void {
    if (this.previewing()) this.selection.toggle(this.id(), rowId, this.multiSelect());
  }

  /**
   * Double-clicking a row (while previewing) selects it and runs the flows triggered by it, so
   * their actions work on that row. Its two clicks toggled the row first; this settles it as selected.
   */
  onRowDoubleClick(rowId: string): void {
    const pageId = this.session.pageId();
    if (!pageId) return;
    this.selection.ensureSelected(this.id(), rowId, this.multiSelect());
    this.widgetEvents.fire({ pageId, elementId: this.id(), event: ROW_DOUBLE_CLICK_EVENT });
  }
}
