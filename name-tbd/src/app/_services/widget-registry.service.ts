import { Injectable } from '@angular/core';
import { WidgetPropDefinition, WidgetPropType } from '../_types/widget.types';
import { CatalogProp, catalogWidget } from '../core/catalog/widget-catalog';

const toDefinition = (widgetType: string) => (prop: CatalogProp, index: number): WidgetPropDefinition => ({
  id: index,
  widgetType,
  propKey: prop.key,
  propType: prop.type as WidgetPropType,
  defaultValue: prop.default ?? '',
  label: prop.label,
  group: prop.group,
  options: prop.options,
});

/**
 * The settings the properties panel shows for each widget type, from the widget catalog. Position
 * and size aren't among them: they're set on the canvas.
 */
@Injectable({ providedIn: 'root' })
export class WidgetRegistryService {
  getPropsForWidget(type: string): WidgetPropDefinition[] {
    return (catalogWidget(type)?.props ?? []).map(toDefinition(type));
  }
}
