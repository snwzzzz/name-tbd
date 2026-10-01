import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BasePropEditor } from '../../../_directives/base-prop-editor.directive';
import { DataSourceStateService } from '../../../_services/data-source-state.service';
import { UiSelect } from '../../../components/ui-select/ui-select';
import { SelectOption } from '../../../_types/select.types';

/** Picks one of the project's data sources (prop type 'dataSource'); stores its id. */
@Component({
  selector: 'app-data-source-prop-editor',
  imports: [FormsModule, UiSelect],
  template: `
    <app-select
      [options]="options()"
      placeholder="Pick a data source…"
      [ngModel]="selected()"
      (ngModelChange)="choose($event)" />
  `,
})
export class DataSourcePropEditor extends BasePropEditor {
  private readonly state = inject(DataSourceStateService);

  readonly options = computed<SelectOption[]>(() => [
    { value: '', label: 'None' },
    ...this.state.sources().map((s) => ({ value: String(s.id), label: s.name ?? `#${s.id}` })),
  ]);
  readonly selected = computed(() => String(this.value() ?? ''));

  constructor() {
    super();
    this.state.ensureLoaded();
  }

  /** Column choices belong to the old data source, so they're reset. */
  choose(id: string): void {
    this.update(id, { columns: '[]' });
  }
}
