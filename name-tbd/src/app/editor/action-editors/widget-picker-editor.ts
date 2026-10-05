import { Component, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAppWindow, LucideClipboardList } from '@lucide/angular';
import { BaseActionEditor } from '../../_directives/base-action-editor.directive';
import { UiSelect } from '../../components/ui-select/ui-select';
import { SelectOption } from '../../_types/select.types';
import { ModalConfig, SubmitFormConfig } from '../../_types/workflow.types';
import { flattenTree } from '../../_utils/layout-tree.utils';
import { propText } from '../../_utils/widget-props.utils';

/** Settings of `open_modal` / `close_modal`: a modal dialog on this page. */
@Component({
  selector: 'app-modal-action-editor',
  imports: [FormsModule, UiSelect],
  template: `
    <label class="field-label">Dialog</label>
    @if (options().length) {
      <app-select size="sm" placeholder="Select a dialog…" [options]="options()" [ngModel]="config().modalId" (ngModelChange)="update()({ modalId: $event })" />
    } @else {
      <p class="hint">Add a Modal Dialog to this page first.</p>
    }
  `,
  styleUrl: './action-editor.scss',
})
export class ModalActionEditor extends BaseActionEditor<ModalConfig> {
  readonly options = computed<SelectOption[]>(() =>
    flattenTree(this.pageItems())
      .filter((i) => i.type === 'modal' && i.id != null)
      .map((i) => ({ value: String(i.id), label: `${propText(i.props, 'title') ?? 'Dialog'} (#${i.id})`, icon: LucideAppWindow })));
}

/** Settings of `submit_form`: a form on this page. */
@Component({
  selector: 'app-submit-form-editor',
  imports: [FormsModule, UiSelect],
  template: `
    <label class="field-label">Form</label>
    @if (options().length) {
      <app-select size="sm" placeholder="Select a form…" [options]="options()" [ngModel]="config().formId" (ngModelChange)="update()({ formId: $event })" />
    } @else {
      <p class="hint">Add a Form to this page first.</p>
    }
  `,
  styleUrl: './action-editor.scss',
})
export class SubmitFormEditor extends BaseActionEditor<SubmitFormConfig> {
  readonly options = computed<SelectOption[]>(() =>
    flattenTree(this.pageItems())
      .filter((i) => i.type === 'form' && i.id != null)
      .map((i) => ({ value: String(i.id), label: `Form (#${i.id})`, icon: LucideClipboardList })));
}
