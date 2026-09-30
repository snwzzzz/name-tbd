import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseWidgetSettings } from '../../core/base-widget';
import { SelectionService } from '../../services/selection.service';

@Component({
  selector: 'app-label-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="ui-fields">
      <div class="ui-field">
        <label class="ui-field-label">Label text</label>
        <textarea
          rows="3"
          class="ui-input"
          [ngModel]="props()['text']"
          (ngModelChange)="updateProp('text', $event)"
        ></textarea>
      </div>

      <div class="ui-field">
        <label class="ui-field-label">Color</label>
        <div class="ui-color">
          <input
            type="color"
            [ngModel]="props()['color'] || '#ffffff'"
            (ngModelChange)="updateProp('color', $event)"
          />
          <span class="ui-color-value">{{ props()['color'] || '#ffffff' }}</span>
        </div>
      </div>
    </div>
  `
})
export class LabelSettingsComponent extends BaseWidgetSettings {
  selection = inject(SelectionService);

  updateProp(key: string, value: any) {
    this.props.update(p => {
      const newProps = { ...p, [key]: value };
      this.selection.updateProps(newProps);
      return newProps;
    });
  }
}
