import { Component, computed, inject } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { LucideGripVertical } from '@lucide/angular';
import { BasePropEditor } from '../../../_directives/base-prop-editor.directive';
import { DataSourceStateService } from '../../../_services/data-source-state.service';
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
  imports: [CdkDropList, CdkDrag, CdkDragHandle, LucideGripVertical],
  templateUrl: './columns-prop-editor.html',
  styleUrl: './columns-prop-editor.scss',
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

  readonly shownCount = computed(() => this.choices()?.filter((c) => c.shown).length ?? 0);

  constructor() {
    super();
    this.state.ensureLoaded();
  }

  toggle(name: string): void {
    const choices = this.choices() ?? [];
    this.save(choices.map((c) => (c.name === name ? { ...c, shown: !c.shown } : c)));
  }

  reorder(event: CdkDragDrop<ColumnChoice[]>): void {
    const choices = [...(this.choices() ?? [])];
    moveItemInArray(choices, event.previousIndex, event.currentIndex);
    this.save(choices);
  }

  private save(choices: ColumnChoice[]): void {
    this.update(JSON.stringify(choices.filter((c) => c.shown).map((c) => c.name)));
  }
}
