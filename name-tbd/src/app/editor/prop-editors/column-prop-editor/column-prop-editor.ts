import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BasePropEditor } from '../../../_directives/base-prop-editor.directive';
import { DataSourceStateService } from '../../../_services/data-source-state.service';
import { UiSelect } from '../../../components/ui-select/ui-select';
import { SelectOption } from '../../../_types/select.types';

/** Picks one column (prop type 'column') of the data source in the widget's `dataSourceId` prop; stores its name. */
@Component({
  selector: 'app-column-prop-editor',
  imports: [FormsModule, UiSelect],
  template: `
    @if (options(); as options) {
      <app-select [options]="options" placeholder="Pick a column…" [ngModel]="selected()" (ngModelChange)="update($event)" />
    } @else {
      <p class="hint">Pick a data source to choose its column.</p>
    }
  `,
  styleUrl: '../prop-editor.scss',
})
export class ColumnPropEditor extends BasePropEditor {
  private readonly state = inject(DataSourceStateService);

  readonly options = computed<SelectOption[] | null>(() => {
    const id = Number(this.props()?.['dataSourceId']);
    const columns = this.state.sources().find((s) => s.id === id)?.columns;
    return columns ? [{ value: '', label: 'None' }, ...columns.map((name) => ({ value: name, label: name }))] : null;
  });
  readonly selected = computed(() => String(this.value() ?? ''));

  constructor() {
    super();
    this.state.ensureLoaded();
  }
}
