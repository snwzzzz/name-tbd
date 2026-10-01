import { Injectable } from '@angular/core';
import { WidgetPropDefinition, WidgetPropType } from '../_types/widget.types';
import { CatalogProp, WIDGET_CATALOG, catalogWidget } from '../core/catalog/widget-catalog';

/** The type the props that apply to every widget are listed under. */
const GLOBAL_TYPE = 'global';

/** `firstId` keeps ids unique across the global and the widget's own props (lists track them by id). */
const toDefinition = (widgetType: string, firstId = 0) => (prop: CatalogProp, index: number): WidgetPropDefinition => ({
  id: firstId + index,
  widgetType,
  propKey: prop.key,
  propType: prop.type as WidgetPropType,
  defaultValue: prop.default ?? '',
  label: prop.label,
  group: prop.group,
  options: prop.options,
});

/** The settings the properties panel shows for each widget type, from the widget catalog. */
@Injectable({ providedIn: 'root' })
export class WidgetRegistryService {
  /** The global settings (position and size), then the widget type's own. */
  getPropsForWidget(type: string): WidgetPropDefinition[] {
    return [
      ...WIDGET_CATALOG.globalProps.map(toDefinition(GLOBAL_TYPE)),
      ...(catalogWidget(type)?.props ?? []).map(toDefinition(type, WIDGET_CATALOG.globalProps.length)),
    ];
  }
}
