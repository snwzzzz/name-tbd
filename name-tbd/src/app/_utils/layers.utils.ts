import { LayoutItem } from '../_types/layout.types';
import { DEFAULT_WIDGET_TYPE, PALETTE_ITEMS, widgetDefinition } from '../_constants/widget-registry.constants';
import { propText } from './widget-props.utils';

// Props that say what a widget shows, in order of preference
const DETAIL_PROPS = ['title', 'label', 'text'];

/** A widget's type name, e.g. "Button" (palette-only types use their palette label). */
export function layerTypeName(item: LayoutItem): string {
  const definition = widgetDefinition(item.type);
  if (definition.type !== DEFAULT_WIDGET_TYPE || item.type === DEFAULT_WIDGET_TYPE) return definition.name;
  return PALETTE_ITEMS.find((p) => p.type === item.type)?.label ?? definition.name;
}

/** What the widget shows (its title, label or text), if anything. */
export function layerDetail(item: LayoutItem): string | undefined {
  for (const key of DETAIL_PROPS) {
    const text = propText(item.props, key);
    if (text) return text;
  }
  return undefined;
}

/** The tree in the order the page reads: top to bottom, then left to right. */
export function sortLayers(items: LayoutItem[]): LayoutItem[] {
  return [...items]
    .sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0))
    .map((item) => (item.children?.length ? { ...item, children: sortLayers(item.children) } : item));
}
