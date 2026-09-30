import { Component, inject, input, computed } from '@angular/core';
import { WidgetRegistryService, WidgetPropDefinition } from '../../core/widget-registry.service';
import { SelectionService } from '../../services/selection.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dynamic-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="p-4 flex flex-col gap-6">
      @for (group of groupedDefs(); track group.name) {
        <div class="flex flex-col gap-3">
          @if (group.name !== '_default') {
            <div class="text-xs font-bold uppercase tracking-widest"
                 style="color: var(--color-text-secondary); border-bottom: 1px solid var(--color-border); padding-bottom: 4px;">
              {{ group.name }}
            </div>
          }

          @for (def of group.defs; track def.id) {
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider"
                     style="color: var(--color-text-secondary);">
                {{ def.label ?? def.propKey }}
              </label>

              @if (def.propType === 'string') {
                <input type="text"
                       [ngModel]="safeProps[def.propKey] ?? def.defaultValue"
                       (ngModelChange)="updateProp(def.propKey, $event)"
                       class="p-2 border rounded text-sm"
                       style="background: var(--color-surface); border-color: var(--color-border); color: var(--color-text-primary);" />
              } @else if (def.propType === 'textarea') {
                <textarea rows="3"
                          [ngModel]="safeProps[def.propKey] ?? def.defaultValue"
                          (ngModelChange)="updateProp(def.propKey, $event)"
                          class="p-2 border rounded text-sm resize-y"
                          style="background: var(--color-surface); border-color: var(--color-border); color: var(--color-text-primary);"></textarea>
              } @else if (def.propType === 'number') {
                <input type="number"
                       [ngModel]="safeProps[def.propKey] ?? def.defaultValue"
                       (ngModelChange)="updateProp(def.propKey, $event)"
                       class="p-2 border rounded text-sm"
                       style="background: var(--color-surface); border-color: var(--color-border); color: var(--color-text-primary);" />
              } @else if (def.propType === 'color') {
                <div class="flex items-center gap-2">
                  <input type="color"
                         [ngModel]="safeProps[def.propKey] ?? def.defaultValue"
                         (ngModelChange)="updateProp(def.propKey, $event)"
                         class="h-8 w-8 rounded cursor-pointer border-0 p-0" />
                  <span class="text-sm font-mono" style="color: var(--color-text-secondary);">
                    {{ safeProps[def.propKey] ?? def.defaultValue }}
                  </span>
                </div>
              } @else if (def.propType === 'boolean') {
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                         [ngModel]="!!(safeProps[def.propKey] ?? (def.defaultValue === 'true'))"
                         (ngModelChange)="updateProp(def.propKey, $event)"
                         class="w-4 h-4 rounded"
                         style="accent-color: var(--color-primary);" />
                  <span class="text-sm" style="color: var(--color-text-primary);">
                    {{ (safeProps[def.propKey] ?? (def.defaultValue === 'true')) ? 'Yes' : 'No' }}
                  </span>
                </label>
              } @else if (def.propType === 'select') {
                <select [ngModel]="safeProps[def.propKey] ?? def.defaultValue"
                        (ngModelChange)="updateProp(def.propKey, $event)"
                        class="p-2 border rounded text-sm"
                        style="background: var(--color-surface); border-color: var(--color-border); color: var(--color-text-primary);">
                  @for (opt of def.options ?? []; track opt) {
                    <option [value]="opt">{{ opt }}</option>
                  }
                </select>
              }
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

  get safeProps() {
    return this.props() || {};
  }

  groupedDefs = computed(() => {
    const defs = this.registry.getPropsForWidget(this.type());
    const groups = new Map<string, WidgetPropDefinition[]>();
    for (const def of defs) {
      const key = (def as any).group ?? '_default';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(def);
    }
    return Array.from(groups.entries()).map(([name, defs]) => ({ name, defs }));
  });

  updateProp(key: string, value: any) {
    const newProps = { ...this.safeProps, [key]: value };
    this.selection.updateProps(newProps);
  }
}
