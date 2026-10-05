import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BasePropEditor } from '../../../_directives/base-prop-editor.directive';
import { DataSourceStateService } from '../../../_services/data-source-state.service';
import { LayoutStateService } from '../../../_services/layout-state.service';
import { SelectionService } from '../../../_services/selection.service';
import { TabsService } from '../../../_services/tabs.service';
import { UiSelect } from '../../../components/ui-select/ui-select';
import { SelectOption } from '../../../_types/select.types';
import { LayoutItem } from '../../../_types/layout.types';
import { findInTree } from '../../../_utils/layout-tree.utils';

/**
 * The column a field saves into (prop type 'field'): one of the columns of the data source of the
 * form the field is in. Stores the column's name.
 */
@Component({
  selector: 'app-field-prop-editor',
  imports: [FormsModule, UiSelect],
  template: `
    @if (options(); as options) {
      <app-select [options]="options" placeholder="Pick a column…" [ngModel]="selected()" (ngModelChange)="update($event)" />
    } @else if (form()) {
      <p class="hint">Pick the data source the form saves into first.</p>
    } @else {
      <p class="hint">Put this field in a Form to save it into a column.</p>
    }
  `,
  styleUrl: '../prop-editor.scss',
})
export class FieldPropEditor extends BasePropEditor {
  private readonly state = inject(DataSourceStateService);
  private readonly layoutState = inject(LayoutStateService);
  private readonly selectionState = inject(SelectionService);
  private readonly tabs = inject(TabsService);

  /** The form around the field (the nearest), if any. */
  readonly form = computed<LayoutItem | null>(() => {
    const pageId = this.tabs.activeTabId();
    const id = this.itemId() ?? this.selectionState.selectedId();
    if (!pageId || id == null) return null;
    const layout = this.layoutState.getLayout(pageId);
    let item = findInTree(layout, id);
    while (item?.parentId != null) {
      item = findInTree(layout, item.parentId);
      if (item?.type === 'form') return item;
    }
    return null;
  });

  readonly options = computed<SelectOption[] | null>(() => {
    const id = Number(this.form()?.props?.['dataSourceId']);
    const columns = this.state.sources().find((s) => s.id === id)?.columns;
    return columns ? [{ value: '', label: 'Not saved' }, ...columns.map((name) => ({ value: name, label: name }))] : null;
  });
  readonly selected = computed(() => String(this.value() ?? ''));

  constructor() {
    super();
    this.state.ensureLoaded();
  }
}
