import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseWidgetSettings } from '../../core/base-widget';
import { SelectionService } from '../../services/selection.service';

@Component({
  selector: 'app-button-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="ui-fields">
      <div class="ui-field">
        <label class="ui-field-label">Button label</label>
        <input
          type="text"
          class="ui-input"
          [ngModel]="props()['label']"
          (ngModelChange)="updateProp('label', $event)"
        />
      </div>
      <!-- Add more settings here in the future -->
    </div>
  `
})
export class ButtonSettingsComponent extends BaseWidgetSettings {
  selection = inject(SelectionService);

  updateProp(key: string, value: any) {
    this.props.update(p => {
      const newProps = { ...p, [key]: value };
      this.selection.updateProps(newProps);
      return newProps;
    });
  }
}
