import { Component, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideSheet } from '@lucide/angular';
import { BaseActionEditor } from '../../_directives/base-action-editor.directive';
import { UiSelect } from '../../components/ui-select/ui-select';
import { SelectOption } from '../../_types/select.types';
import { TableActionConfig } from '../../_types/workflow.types';
import { propText } from '../../_utils/widget-props.utils';
import { TABLE_OPERATIONS } from './table-operations';

/** Settings of the table action: which data table on the page, and what to do with it. */
@Component({
  selector: 'app-table-action-editor',
  imports: [FormsModule, UiSelect],
  template: `
    <label class="field-label">Table</label>
    @if (tableOptions().length) {
      <app-select
        size="sm"
        placeholder="Select a table…"
        [options]="tableOptions()"
        [ngModel]="config().tableId"
        (ngModelChange)="update()({ tableId: $event })" />
    } @else {
      <p class="hint">Add a Data Table to the page first.</p>
    }

    <label class="field-label">Do</label>
    <app-select
      size="sm"
      [options]="operationOptions"
      [ngModel]="config().operation"
      (ngModelChange)="update()({ operation: $event })" />
  `,
  styleUrl: '../action-editor.scss',
})
export class TableActionEditor extends BaseActionEditor<TableActionConfig> {
  readonly operationOptions: SelectOption[] = TABLE_OPERATIONS.map((o) => ({ value: o.id, label: o.label }));

  readonly tableOptions = computed<SelectOption[]>(() =>
    this.pageItems()
      .filter((i) => i.type === 'table' && typeof i.id === 'number')
      .map((i) => ({ value: i.id!.toString(), label: `${propText(i.props, 'title') ?? 'Table'} (#${i.id})`, icon: LucideSheet })));
}
