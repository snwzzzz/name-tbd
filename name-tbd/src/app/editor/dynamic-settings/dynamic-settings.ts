import { Component, Type, computed, inject, input } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WidgetRegistryService } from '../../_services/widget-registry.service';
import { SelectionService } from '../../_services/selection.service';
import { UiSelect } from '../../components/ui-select/ui-select';
import { WidgetProps } from '../../_types/layout.types';
import { WidgetPropDefinition } from '../../_types/widget.types';
import { SelectOption } from '../../_types/select.types';
import { BasePropEditor } from '../../_directives/base-prop-editor.directive';
import { PROP_EDITORS } from '../../_constants/prop-editors.constants';

interface SettingsGroup {
  name: string;
  defs: WidgetPropDefinition[];
}

const UNGROUPED = '_default';

/** Settings form generated from the widget type's prop definitions in the backend. */
@Component({
  selector: 'app-dynamic-settings',
  imports: [FormsModule, NgComponentOutlet, UiSelect],
  templateUrl: './dynamic-settings.html',
  styleUrl: './dynamic-settings.scss',
})
export class DynamicSettings {
  private readonly registry = inject(WidgetRegistryService);
  private readonly selection = inject(SelectionService);

  readonly type = input.required<string>();
  readonly props = input.required<WidgetProps | undefined>();

  readonly ungrouped = UNGROUPED;

  readonly groups = computed<SettingsGroup[]>(() => {
    const groups = new Map<string, WidgetPropDefinition[]>();
    for (const def of this.registry.getPropsForWidget(this.type())) {
      const key = def.group ?? UNGROUPED;
      groups.set(key, [...(groups.get(key) ?? []), def]);
    }
    return [...groups].map(([name, defs]) => ({ name, defs }));
  });

  /** The prop's current value, or its default. */
  value(def: WidgetPropDefinition): unknown {
    return this.props()?.[def.propKey] ?? def.defaultValue;
  }

  checked(def: WidgetPropDefinition): boolean {
    return !!(this.props()?.[def.propKey] ?? def.defaultValue === 'true');
  }

  options(def: WidgetPropDefinition): SelectOption[] {
    return (def.options ?? []).map((o) => ({ value: o, label: o }));
  }

  /** The editor for a prop type the built-in inputs don't cover (see PROP_EDITORS). */
  editor(def: WidgetPropDefinition): Type<BasePropEditor> | undefined {
    return PROP_EDITORS[def.propType];
  }

  updateProp(key: string, value: unknown): void {
    this.selection.updateProps({ ...this.props(), [key]: value });
  }
}
