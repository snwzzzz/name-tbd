import { Component, computed, effect, inject } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { APP_DATA, APP_SESSION } from '../../core/ports/app-ports';
import { TableSelectionService } from '../../core/services/table-selection.service';
import { WidgetEventsService } from '../../core/services/widget-events.service';
import { ROW_DOUBLE_CLICK_EVENT } from '../../_constants/widget-events.constants';
import { TableData } from '../../_types/data-source.types';
import { propBool, propNumber } from '../../_utils/widget-props.utils';
import { parseColumnList, visibleColumnIndexes } from '../../_utils/table.utils';

export const TABLE_DEFAULT_MAX_ROWS = 10;
const MAX_ROWS_LIMIT = 1000;

/**
 * Shows (some columns of) a data source's rows. While the app runs (the editor's preview, or an
 * exported app), rows can be selected by clicking them and double-clicking one fires the table's
 * trigger (see WIDGET_TRIGGERS).
 */
@Component({
  selector: 'app-table-widget',
  templateUrl: './table-widget.html',
  styleUrl: './table-widget.scss',
})
export class TableWidget extends BaseWidget {
  private readonly appData = inject(APP_DATA);
  private readonly selection = inject(TableSelectionService);
  private readonly widgetEvents = inject(WidgetEventsService);
  private readonly session = inject(APP_SESSION);
  readonly previewing = this.session.live;

  readonly title = computed(() => this.text('title'));
  readonly showHeader = computed(() => propBool(this.props(), 'showHeader', true));
  readonly striped = computed(() => propBool(this.props(), 'striped', false));
  readonly multiSelect = computed(() => propBool(this.props(), 'multiSelect', false));
  /** Colors picked in its style settings (null: the theme's). */
  readonly background = computed(() => this.text('background') ?? null);
  readonly headerBackground = computed(() => this.text('headerBackground') ?? null);
  readonly headerColor = computed(() => this.text('headerColor') ?? null);
  private readonly maxRows = computed(() =>
    Math.min(MAX_ROWS_LIMIT, Math.max(0, Math.floor(propNumber(this.props(), 'maxRows', TABLE_DEFAULT_MAX_ROWS)))),
  );

  readonly dataSourceId = computed(() => {
    const id = propNumber(this.props(), 'dataSourceId', NaN);
    return Number.isInteger(id) ? id : null;
  });
  /** The rows to show; null until loaded. */
  readonly data = computed<TableData | null>(() => {
    const id = this.dataSourceId();
    return id === null ? null : this.appData.table(id);
  });
  /** Whether the data source can't be shown (deleted, or failed to load). */
  readonly missing = computed(() => {
    const id = this.dataSourceId();
    return id !== null && !this.data() && this.appData.loaded() && !this.appData.sources().some((s) => s.id === id);
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
    effect(() => {
      const id = this.dataSourceId();
      if (id !== null) this.appData.ensureTable(id);
    });
  }

  /** Rows are only selectable while the app runs (when editing, clicks select the widget). */
  onRowClick(rowId: string): void {
    if (this.previewing()) this.selection.toggle(this.id(), rowId, this.multiSelect());
  }

  /**
   * Double-clicking a row (while the app runs) selects it and runs the flows triggered by it, so
   * their actions work on that row. Its two clicks toggled the row first; this settles it as selected.
   */
  onRowDoubleClick(rowId: string): void {
    const pageId = this.session.pageId();
    if (!pageId) return;
    this.selection.ensureSelected(this.id(), rowId, this.multiSelect());
    this.widgetEvents.fire({ pageId, elementId: this.id(), event: ROW_DOUBLE_CLICK_EVENT });
  }
}
