import { Component, computed, inject } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { APP_SESSION } from '../../core/ports/app-ports';
import { TableSelectionService } from '../../core/services/table-selection.service';
import { TableFilterService } from '../../core/services/table-filter.service';
import { WidgetEventsService } from '../../core/services/widget-events.service';
import { cellText, parseFileValue } from '../../core/forms/file-value';
import { ITEM_CLICK_EVENT } from '../../_constants/widget-events.constants';
import { propNumber } from '../../_utils/widget-props.utils';
import { parseColumnList, rowMatches } from '../../_utils/table.utils';
import { bindDataSource, columnIndex } from '../_shared/data-source-binding';

const LIST_DEFAULT_MAX_ITEMS = 50;
const MAX_ITEMS_LIMIT = 500;

/** One card: what it shows of its row. */
export interface ListCard {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  image: string | null;
  fields: { name: string; value: string }[];
  /** Everything it shows, for searching. */
  text: string[];
}

/**
 * A card for each row of a data source (a list, or a grid of cards): a title, a subtitle, a status
 * badge, an image and more fields, each from a column. While the app runs, clicking a card selects
 * its row, like a table's (so "show detail" and forms work with it) and fires its trigger; a search
 * action filters it like a table.
 */
@Component({
  selector: 'app-list-widget',
  templateUrl: './list-widget.html',
  styleUrl: './list-widget.scss',
  host: { '[class.live]': 'session.live()' },
})
export class ListWidget extends BaseWidget {
  protected readonly session = inject(APP_SESSION);
  private readonly selection = inject(TableSelectionService);
  private readonly filter = inject(TableFilterService);
  private readonly widgetEvents = inject(WidgetEventsService);
  readonly source = bindDataSource(this.props);

  readonly grid = computed(() => this.text('layout') === 'Grid');
  readonly cardsPerRow = computed(() => Math.min(8, Math.max(1, Math.floor(propNumber(this.props(), 'cardsPerRow', 3)))));
  readonly emptyText = computed(() => this.text('emptyText') ?? '');
  private readonly maxItems = computed(() =>
    Math.min(MAX_ITEMS_LIMIT, Math.max(0, Math.floor(propNumber(this.props(), 'maxItems', LIST_DEFAULT_MAX_ITEMS)))),
  );

  private readonly cards = computed<ListCard[]>(() => {
    const table = this.source.table();
    if (!table) return [];
    const props = this.props();
    const [title, subtitle, badge, image] = ['titleColumn', 'subtitleColumn', 'badgeColumn', 'imageColumn'].map((key) => columnIndex(table, props, key));
    const more = parseColumnList(props['columns']).map((name) => table.columns.indexOf(name)).filter((i) => i >= 0);
    // Without a title column, the first column is the title
    const titleIndex = title >= 0 ? title : 0;
    return table.rows.map((row) => {
      const value = (i: number) => (i >= 0 ? cellText(row.values[i]) : '');
      const fields = more.map((i) => ({ name: table.columns[i], value: value(i) }));
      const card = { id: row.id, title: value(titleIndex), subtitle: value(subtitle), badge: value(badge), image: imageUrl(row.values[image]), fields };
      return { ...card, text: [card.title, card.subtitle, card.badge, ...fields.map((f) => f.value)] };
    });
  });
  readonly query = computed(() => (this.session.live() ? this.filter.query(this.id()) : ''));
  readonly visibleCards = computed(() => this.cards().filter((card) => rowMatches(card.text, this.query())).slice(0, this.maxItems()));
  readonly selectedIds = computed(() => new Set(this.selection.selected(this.id())));

  select(card: ListCard): void {
    const pageId = this.session.pageId();
    if (!this.session.live() || !pageId) return;
    this.selection.ensureSelected(this.id(), card.id, false);
    this.widgetEvents.fire({ pageId, elementId: this.id(), event: ITEM_CLICK_EVENT });
  }

  onKey(event: KeyboardEvent, card: ListCard): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.select(card);
  }
}

/** An image to show from a cell: a URL, or an uploaded image file. */
function imageUrl(value: string | undefined): string | null {
  const file = parseFileValue(value);
  if (file) return file.type.startsWith('image/') ? file.url : null;
  return value && /^(https?:)?\/\//i.test(value.trim()) ? value.trim() : null;
}
