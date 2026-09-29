import { Component, inject, input } from '@angular/core';
import { WidgetRegistryService, WidgetPropDefinition } from '../../core/widget-registry.service';
import { SelectionService } from '../../services/selection.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dynamic-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="p-4 flex flex-col gap-4">
      @for (def of definitions(); track def.id) {
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--color-text-secondary);">
            {{ def.propKey }}
          </label>
          
          @if (def.propType === 'string') {
            <input type="text"
                   [ngModel]="props()[def.propKey] ?? def.defaultValue"
                   (ngModelChange)="updateProp(def.propKey, $event)"
                   class="p-2 border rounded"
                   style="background: var(--color-surface); border-color: var(--color-border); color: var(--color-text-primary);" />
          } @else if (def.propType === 'number') {
            <input type="number"
                   [ngModel]="props()[def.propKey] ?? def.defaultValue"
                   (ngModelChange)="updateProp(def.propKey, $event)"
                   class="p-2 border rounded"
                   style="background: var(--color-surface); border-color: var(--color-border); color: var(--color-text-primary);" />
          } @else if (def.propType === 'color') {
            <div class="flex items-center gap-2">
              <input type="color"
                     [ngModel]="props()[def.propKey] ?? def.defaultValue"
                     (ngModelChange)="updateProp(def.propKey, $event)"
                     class="h-8 w-8 rounded cursor-pointer border-0 p-0" />
              <span class="text-sm" style="color: var(--color-text-secondary);">
                {{ props()[def.propKey] ?? def.defaultValue }}
              </span>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class DynamicSettingsComponent {
  registry = inject(WidgetRegistryService);
  selection = inject(SelectionService);
  
  type = input.required<string>();
  props = input.required<any>();

  get definitions() {
    return () => this.registry.getPropsForWidget(this.type());
  }

  updateProp(key: string, value: any) {
    const newProps = { ...this.props(), [key]: value };
    this.selection.updateProps(newProps);
  }
}
