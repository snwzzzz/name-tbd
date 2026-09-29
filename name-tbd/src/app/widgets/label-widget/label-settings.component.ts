import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseWidgetSettings } from '../../core/base-widget';
import { SelectionService } from '../../services/selection.service';

@Component({
  selector: 'app-label-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="p-4 flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label class="font-semibold" style="color: var(--color-text-secondary);">Label Text</label>
        <textarea 
          [ngModel]="props()['text']" 
          (ngModelChange)="updateProp('text', $event)" 
          rows="3"
          class="rounded px-2 py-1 focus:outline-none w-full"
          style="background-color: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text-primary);"
        ></textarea>
      </div>

      <div class="flex flex-col gap-1">
        <label class="font-semibold" style="color: var(--color-text-secondary);">Color</label>
        <div class="flex items-center gap-2">
          <input 
            type="color" 
            [ngModel]="props()['color'] || '#ffffff'" 
            (ngModelChange)="updateProp('color', $event)"
            class="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
          />
          <span class="text-sm" style="color: var(--color-text-secondary);">{{ props()['color'] || '#ffffff' }}</span>
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
