import { Component, computed } from '@angular/core';
import { BaseFieldWidget } from '../_shared/base-field-widget';
import { bindDataSource, columnIndex } from '../_shared/data-source-binding';

/** Most options a dropdown lists (from a data source's column). */
const MAX_OPTIONS = 500;

/**
 * A dropdown: its options are typed in (one per line), or come from a column of a data source
 * (each different value once). Picking one fires its change trigger.
 */
@Component({
  selector: 'app-select-widget',
  templateUrl: './select-widget.html',
  styleUrl: './select-widget.scss',
})
export class SelectWidget extends BaseFieldWidget {
  protected readonly kind = 'choice';
  private readonly source = bindDataSource(this.props);

  readonly placeholder = computed(() => this.text('placeholder') ?? '');
  readonly options = computed(() => {
    const table = this.source.table();
    const column = columnIndex(table, this.props(), 'optionsColumn');
    if (table && column >= 0) {
      const values = table.rows.map((row) => row.values[column] ?? '').filter((value) => value.trim() !== '');
      return [...new Set(values)].slice(0, MAX_OPTIONS);
    }
    return (this.text('options') ?? '').split('\n').map((line) => line.trim()).filter((line) => line !== '');
  });
}
