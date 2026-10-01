import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BasePropEditor } from '../../../_directives/base-prop-editor.directive';
import { PagesStateService } from '../../../_services/pages-state.service';
import { UiSelect } from '../../../components/ui-select/ui-select';
import { SelectOption } from '../../../_types/select.types';

/** Picks one of the project's pages (prop type 'page'); stores its id. */
@Component({
  selector: 'app-page-prop-editor',
  imports: [FormsModule, UiSelect],
  template: `
    <app-select [options]="options()" placeholder="Pick a page…" [ngModel]="selected()" (ngModelChange)="update($event)" />
  `,
})
export class PagePropEditor extends BasePropEditor {
  private readonly pages = inject(PagesStateService);

  readonly options = computed<SelectOption[]>(() => [
    { value: '', label: 'None' },
    ...this.pages.contentPages().map((page) => ({ value: String(page.id), label: `${page.name} (${page.path})` })),
  ]);
  readonly selected = computed(() => String(this.value() ?? ''));

  constructor() {
    super();
    this.pages.ensureLoaded();
  }
}
