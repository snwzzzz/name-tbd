import { Component, Injector, Type, computed, inject, input, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WidgetRegistryService } from '../../_services/widget-registry.service';
import { SelectionService } from '../../_services/selection.service';
import { UiSelect } from '../../components/ui-select/ui-select';
import { ColorField } from '../../components/color-field/color-field';
import { WidgetProps } from '../../_types/layout.types';
import { WidgetPropDefinition } from '../../_types/widget.types';
import { SelectOption } from '../../_types/select.types';
import { BasePropEditor } from '../../_directives/base-prop-editor.directive';
import { PROP_EDITORS } from '../../_constants/prop-editors.constants';
import { ExpressionInput } from '../../components/expression-input/expression-input';
import { ExpressionScopeService } from '../../core/expressions/expression-scope.service';
import { TabsService } from '../../_services/tabs.service';
import { ScopeEntry, isTemplate } from '../../../flow-engine';

/** Prop types that can be bound to an expression instead of a fixed value. */
const BINDABLE = new Set(['string', 'textarea', 'number', 'color', 'boolean', 'select']);

interface SettingsGroup {
  name: string;
  defs: WidgetPropDefinition[];
}

const UNGROUPED = '_default';

/** Settings form generated from the widget type's prop definitions in the backend. */
@Component({
  selector: 'app-dynamic-settings',
  imports: [FormsModule, NgComponentOutlet, UiSelect, ColorField, ExpressionInput],
  templateUrl: './dynamic-settings.html',
  styleUrl: './dynamic-settings.scss',
})
export class DynamicSettings {
  private readonly registry = inject(WidgetRegistryService);
  private readonly selection = inject(SelectionService);
  private readonly injector = inject(Injector);

  readonly type = input.required<string>();
  readonly props = input.required<WidgetProps | undefined>();
  /** The widget these are the settings of (null: the one selected last). */
  readonly itemId = input<string | null>(null);

  readonly ungrouped = UNGROUPED;
  /** Props switched to an expression that don't have one yet. */
  private readonly expressionKeys = signal<Set<string>>(new Set());
  readonly expressionPlaceholder = 'e.g. {{ orderForm.amount * 2 }}';

  /** What expressions in the settings can use: the open page's names (looked up only once a prop is bound). */
  readonly scope = computed<ScopeEntry[]>(() => {
    const pageId = this.injector.get(TabsService).activeTabId();
    return pageId ? this.injector.get(ExpressionScopeService).entries(pageId) : [];
  });

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

  colorValue(def: WidgetPropDefinition): string {
    return String(this.value(def) ?? '');
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

  /** Whether the prop can be bound to an expression. */
  bindable(def: WidgetPropDefinition): boolean {
    return BINDABLE.has(def.propType);
  }

  /** Whether the prop shows as an expression (it has one, or was just switched to one). */
  bound(def: WidgetPropDefinition): boolean {
    return isTemplate(this.props()?.[def.propKey]) || this.expressionKeys().has(def.propKey);
  }

  /** Switches between a fixed value and an expression (back to fixed: the default value). */
  toggleExpression(def: WidgetPropDefinition): void {
    const key = def.propKey;
    if (this.bound(def)) {
      this.expressionKeys.update((keys) => new Set([...keys].filter((k) => k !== key)));
      if (isTemplate(this.props()?.[key])) this.updateProp(key, def.defaultValue ?? '');
    } else {
      this.expressionKeys.update((keys) => new Set([...keys, key]));
    }
  }

  updateProp(key: string, value: unknown): void {
    this.selection.updateProps({ ...this.props(), [key]: value }, this.itemId() ?? undefined);
  }
}
