import { Component, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideType } from '@lucide/angular';
import { BaseActionEditor } from '../../_directives/base-action-editor.directive';
import { UiSelect } from '../../components/ui-select/ui-select';
import { SelectOption } from '../../_types/select.types';
import { SetTextConfig } from '../../_types/workflow.types';
import { propText } from '../../_utils/widget-props.utils';

/** Settings of `set_text`: which label, the new text, and whether to reset it. */
@Component({
  selector: 'app-set-text-editor',
  imports: [FormsModule, UiSelect],
  template: `
    <label class="field-label">Label</label>
    <app-select
      size="sm"
      placeholder="Select a label…"
      [options]="labelOptions()"
      [ngModel]="config().targetId"
      (ngModelChange)="update()({ targetId: $event })" />

    <label class="field-label">New text</label>
    <input class="node-input" placeholder="Text to show" [ngModel]="config().text" (ngModelChange)="update()({ text: $event })" />

    <div class="reset-row">
      <label class="check-label">
        <input type="checkbox" [ngModel]="config().resetEnabled" (ngModelChange)="update()({ resetEnabled: $event })" />
        Reset after
      </label>
      <input
        class="node-input seconds-input"
        type="number"
        min="1"
        [disabled]="!config().resetEnabled"
        [ngModel]="config().resetAfterSeconds"
        (ngModelChange)="update()({ resetAfterSeconds: $event })" />
      <span>s</span>
    </div>
  `,
  styleUrl: '../action-editor.scss',
})
export class SetTextEditor extends BaseActionEditor<SetTextConfig> {
  readonly labelOptions = computed<SelectOption[]>(() =>
    this.pageItems()
      .filter((i) => i.type === 'label' && typeof i.id === 'number')
      .map((i) => ({ value: i.id!.toString(), label: `${propText(i.props, 'text') ?? 'New Label'} (#${i.id})`, icon: LucideType })));
}
