import { Component, computed, inject } from '@angular/core';
import { BasePropEditor } from '../../../_directives/base-prop-editor.directive';
import { DataSourceStateService } from '../../../_services/data-source-state.service';
import { ChecklistItem, OrderedChecklist } from '../../../components/ordered-checklist/ordered-checklist';
import { parseColumnList, visibleColumnIndexes } from '../../../_utils/table.utils';

interface ColumnChoice {
  name: string;
  shown: boolean;
}

/**
 * Chooses and orders the columns a widget shows (prop type 'columns'), from the data source in its
 * `dataSourceId` prop. Stores the shown column names as a JSON array.
 */
@Component({
  selector: 'app-columns-prop-editor',
  imports: [OrderedChecklist],
  template: `
    @if (items(); as items) {
      <app-ordered-checklist keepOneChecked [items]="items" (changed)="save($event)" />
    } @else {
      <p class="hint">Pick a data source to choose its columns.</p>
    }
  `,
  styleUrl: '../prop-editor.scss',
})
export class ColumnsPropEditor extends BasePropEditor {
  private readonly state = inject(DataSourceStateService);

  /** The data source's columns (from the list, which already has them). */
  private readonly allColumns = computed(() => {
    const id = Number(this.props()?.['dataSourceId']);
    return this.state.sources().find((s) => s.id === id)?.columns ?? null;
  });

  /** Shown columns first, in their order, then the hidden ones in the data source's order. */
  readonly choices = computed<ColumnChoice[] | null>(() => {
    const all = this.allColumns();
    if (!all) return null;
    const shown = visibleColumnIndexes(all, parseColumnList(this.value())).map((i) => all[i]);
    const hidden = all.filter((name) => !shown.includes(name));
    return [...shown.map((name) => ({ name, shown: true })), ...hidden.map((name) => ({ name, shown: false }))];
  });

  readonly items = computed<ChecklistItem[] | null>(
    () => this.choices()?.map((c) => ({ id: c.name, label: c.name, checked: c.shown })) ?? null,
  );

  constructor() {
    super();
    this.state.ensureLoaded();
  }

  toggle(name: string): void {
    this.save((this.items() ?? []).map((item) => (item.id === name ? { ...item, checked: !item.checked } : item)));
  }

  save(items: ChecklistItem[]): void {
    this.update(JSON.stringify(items.filter((item) => item.checked).map((item) => item.id)));
  }
}
