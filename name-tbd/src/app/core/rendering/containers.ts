import { LayoutItem, WidgetProps } from '../../_types/layout.types';
import { propNumber, propText } from '../../_utils/widget-props.utils';
import { headerRowsOf } from '../catalog/widget-catalog';

// Rules for widgets that hold others (containers, cards, tabs, modals, forms), shared by the
// canvas and WidgetGrid so the editor and the exported app draw them alike.

/** The class for a container's "Appearance" (global styles in _styles/_widgets.scss). */
export function containerClass(props: WidgetProps | undefined): string {
  switch (propText(props, 'appearance')) {
    case 'Card': return 'container-card';
    case 'Outline': return 'container-outline';
    default: return 'container-plain';
  }
}

/** The tabs a tabs widget has: its "Tabs" setting, one per line (at least one). */
export function tabNames(props: WidgetProps | undefined): string[] {
  const names = (propText(props, 'tabs') ?? '').split('\n').map((line) => line.trim()).filter((line) => line !== '');
  return names.length > 0 ? names : ['Tab 1'];
}

/** The tab a widget inside a tabs widget is on (its `tab` prop), within the tabs there are. */
export function tabOf(child: LayoutItem, tabCount: number): number {
  const tab = Math.floor(propNumber(child.props, 'tab', 0));
  return Math.min(Math.max(0, tab), Math.max(0, tabCount - 1));
}

/** The widgets of a container that show: for a tabs widget, those on its active tab; else all. */
export function visibleChildren(item: LayoutItem, activeTab: number): LayoutItem[] {
  const children = item.children ?? [];
  if (item.type !== 'tabs') return children;
  const count = tabNames(item.props).length;
  const active = Math.min(activeTab, count - 1);
  return children.filter((child) => tabOf(child, count) === active);
}

/** Widgets drawn over the page instead of in it (modal dialogs, while closed they don't show). */
export const isOverlayType = (type: string | undefined): boolean => type === 'modal';

/** The widgets that take room on the page (what its height follows). */
export const inFlow = (items: LayoutItem[]): LayoutItem[] => items.filter((item) => !isOverlayType(item.type));

/** The rows a container's nested grid has: its height, less the rows its header takes. */
export const innerRows = (item: { type?: string; h?: number }): number => Math.max(1, (item.h ?? 1) - headerRowsOf(item.type));
