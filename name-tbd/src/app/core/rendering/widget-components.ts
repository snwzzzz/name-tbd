import { Type } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { LayoutItem, WidgetProps } from '../../_types/layout.types';
import { catalogDefaults, catalogWidget } from '../catalog/widget-catalog';
import { ButtonWidget } from '../../widgets/button-widget/button-widget';
import { DefaultWidget } from '../../widgets/default-widget/default-widget';
import { FormWidget } from '../../widgets/form-widget/form-widget';
import { LabelWidget } from '../../widgets/label-widget/label-widget';
import { TableWidget } from '../../widgets/table-widget/table-widget';
import { LinkWidget } from '../../widgets/link-widget/link-widget';
import { NavWidget } from '../../widgets/nav-widget/nav-widget';
import { DetailWidget } from '../../widgets/detail-widget/detail-widget';
import { InputWidget } from '../../widgets/input-widget/input-widget';

// Widget types and their settings live in the widget catalog (shared with the backend, see
// core/catalog). Here each type gets the component that draws it, in the editor and in the
// exported app alike. A new widget: a catalog entry, and its component here.

/** The component that draws each catalog widget type. */
export const WIDGET_COMPONENTS: Record<string, Type<BaseWidget>> = {
  button: ButtonWidget,
  label: LabelWidget,
  input: InputWidget,
  form: FormWidget,
  table: TableWidget,
  link: LinkWidget,
  nav: NavWidget,
  detail: DetailWidget,
  // No component of its own: grids give it a nested grid
  container: DefaultWidget,
};

/** The component that draws a widget type (a placeholder for unknown types). */
export const widgetComponent = (type: string | undefined): Type<BaseWidget> =>
  WIDGET_COMPONENTS[type ?? ''] ?? DefaultWidget;

/** A placed widget's props, with its type's defaults for the ones it doesn't set. */
export function widgetProps(item: LayoutItem): WidgetProps {
  const widget = catalogWidget(item.type);
  return { ...(widget ? catalogDefaults(widget) : {}), ...item.props };
}

/** Whether a widget type fills its cells to their edges (no widget margin): containers, and types marked `flush`. */
export function isFlushType(type: string | undefined): boolean {
  const widget = catalogWidget(type);
  return !!widget?.container || !!widget?.flush;
}

/** Whether a placed widget holds other widgets (drawn as a nested grid). */
export function isContainer(item: LayoutItem): boolean {
  return !!catalogWidget(item.type)?.container || !!item.children?.length;
}
