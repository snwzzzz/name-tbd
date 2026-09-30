import { Component, inject, input, computed } from '@angular/core';
import { WidgetRegistryService, WidgetPropDefinition } from '../../core/widget-registry.service';
import { SelectionService } from '../../services/selection.service';
import { FormsModule } from '@angular/forms';
import { SelectOption, UiSelect } from '../../ui-select/ui-select';

@Component({
  selector: 'app-dynamic-settings',
  standalone: true,
  imports: [FormsModule, UiSelect],
  template: `
    <div class="ui-fields groups">
      @for (group of groupedDefs(); track group.name) {
        <div class="ui-fields">
          @if (group.name !== '_default') {
            <div class="ui-section-title">{{ group.name }}</div>
          }

          @for (def of group.defs; track def.id) {
            <div class="ui-field">
              @if (def.propType !== 'boolean') {
                <label class="ui-field-label">{{ def.label ?? def.propKey }}</label>
              }

              @if (def.propType === 'string') {
                <input type="text" class="ui-input"
                       [ngModel]="safeProps[def.propKey] ?? def.defaultValue"
                       (ngModelChange)="updateProp(def.propKey, $event)" />
              } @else if (def.propType === 'textarea') {
                <textarea rows="3" class="ui-input"
                          [ngModel]="safeProps[def.propKey] ?? def.defaultValue"
                          (ngModelChange)="updateProp(def.propKey, $event)"></textarea>
              } @else if (def.propType === 'number') {
                <input type="number" class="ui-input"
                       [ngModel]="safeProps[def.propKey] ?? def.defaultValue"
                       (ngModelChange)="updateProp(def.propKey, $event)" />
              } @else if (def.propType === 'color') {
                <div class="ui-color">
                  <input type="color"
                         [ngModel]="safeProps[def.propKey] ?? def.defaultValue"
                         (ngModelChange)="updateProp(def.propKey, $event)" />
                  <span class="ui-color-value">{{ safeProps[def.propKey] ?? def.defaultValue }}</span>
                </div>
              } @else if (def.propType === 'boolean') {
                <label class="ui-check">
                  <input type="checkbox"
                         [ngModel]="!!(safeProps[def.propKey] ?? (def.defaultValue === 'true'))"
                         (ngModelChange)="updateProp(def.propKey, $event)" />
                  {{ def.label ?? def.propKey }}
                </label>
              } @else if (def.propType === 'select') {
                <app-select
                  [options]="optionsFor(def)"
                  [ngModel]="safeProps[def.propKey] ?? def.defaultValue"
                  (ngModelChange)="updateProp(def.propKey, $event)"></app-select>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .groups { gap: 1.25rem; }
  `]
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

  optionsFor(def: WidgetPropDefinition): SelectOption[] {
    return (def.options ?? []).map((o) => ({ value: String(o), label: String(o) }));
  }

  updateProp(key: string, value: any) {
    const newProps = { ...this.safeProps, [key]: value };
    this.selection.updateProps(newProps);
  }
}
