import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseWidgetSettings } from '../../core/base-widget';
import { SelectionService } from '../../services/selection.service';

@Component({
  selector: 'app-button-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex flex-col gap-3 p-4 text-sm" style="color: var(--color-text-primary);">
      <div class="flex flex-col gap-1">
        <label class="font-semibold" style="color: var(--color-text-secondary);">Button Label</label>
        <input 
          type="text" 
          [ngModel]="props()['label']" 
          (ngModelChange)="updateProp('label', $event)" 
          class="rounded px-2 py-1 focus:outline-none"
          style="background-color: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text-primary);"
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
