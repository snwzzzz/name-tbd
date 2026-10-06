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
import { SelectWidget } from '../../widgets/select-widget/select-widget';
import { CheckboxWidget } from '../../widgets/checkbox-widget/checkbox-widget';
import { ToggleWidget } from '../../widgets/toggle-widget/toggle-widget';
import { NumberWidget } from '../../widgets/number-widget/number-widget';
import { DateWidget } from '../../widgets/date-widget/date-widget';
import { TextareaWidget } from '../../widgets/textarea-widget/textarea-widget';
import { FileWidget } from '../../widgets/file-widget/file-widget';
import { ImageWidget } from '../../widgets/image-widget/image-widget';
import { DividerWidget } from '../../widgets/divider-widget/divider-widget';
import { IconWidget } from '../../widgets/icon-widget/icon-widget';
import { BadgeWidget } from '../../widgets/badge-widget/badge-widget';
import { ProgressWidget } from '../../widgets/progress-widget/progress-widget';
import { ChartWidget } from '../../widgets/chart-widget/chart-widget';
import { ListWidget } from '../../widgets/list-widget/list-widget';
import { RichtextWidget } from '../../widgets/richtext-widget/richtext-widget';
import { TabsWidget } from '../../widgets/tabs-widget/tabs-widget';
import { ModalWidget } from '../../widgets/modal-widget/modal-widget';

// Widget types and their settings live in the widget catalog (shared with the backend, see
// core/catalog). Here each type gets the component that draws it, in the editor and in the
// exported app alike. A new widget: a catalog entry, and its component here.

/**
 * The component that draws each catalog widget type. A container's component draws over it (its
 * tab bar, title bar, messages: its "frame"), while grids give it a nested grid for its widgets.
 */
export const WIDGET_COMPONENTS: Record<string, Type<BaseWidget>> = {
  button: ButtonWidget,
  label: LabelWidget,
  input: InputWidget,
  table: TableWidget,
  link: LinkWidget,
  nav: NavWidget,
  detail: DetailWidget,
  select: SelectWidget,
  checkbox: CheckboxWidget,
  toggle: ToggleWidget,
  number: NumberWidget,
  date: DateWidget,
  textarea: TextareaWidget,
  file: FileWidget,
  image: ImageWidget,
  divider: DividerWidget,
  icon: IconWidget,
  badge: BadgeWidget,
  progress: ProgressWidget,
  chart: ChartWidget,
  list: ListWidget,
  richtext: RichtextWidget,
  // Containers: no frame of their own (DefaultWidget is never drawn for them), or their frame
  container: DefaultWidget,
  tabs: TabsWidget,
  modal: ModalWidget,
  form: FormWidget,
};

/** The component drawn over a container (its frame), or null when it has none. */
export function containerFrame(type: string | undefined): Type<BaseWidget> | null {
  const component = WIDGET_COMPONENTS[type ?? ''];
  return component && component !== DefaultWidget ? component : null;
}

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
