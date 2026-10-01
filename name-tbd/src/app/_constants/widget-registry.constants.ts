import {
  LucideComponent, LucideIcon, LucideLink, LucideMousePointerClick, LucideNavigation, LucidePanelsTopLeft, LucideSheet,
  LucideSquareDashed, LucideTextCursorInput, LucideType,
} from '@lucide/angular';
import { PaletteCategory, PaletteItem, WidgetDefinition } from '../_types/widget.types';
import { CatalogWidget, WIDGET_CATALOG, catalogDefaults } from '../core/catalog/widget-catalog';
import { WIDGET_COMPONENTS } from '../core/rendering/widget-components';
import { DefaultWidget } from '../widgets/default-widget/default-widget';

// The editor's view of the widget catalog (core/catalog): icons, the palette, and the registry
// entries the canvas uses. Which component draws a type is core (core/rendering/widget-components).

export { WIDGET_COMPONENTS };

/** The Lucide icons the catalog refers to by name. */
export const WIDGET_ICONS: Record<string, LucideIcon> = {
  'mouse-pointer-click': LucideMousePointerClick,
  type: LucideType,
  'text-cursor-input': LucideTextCursorInput,
  sheet: LucideSheet,
  link: LucideLink,
  navigation: LucideNavigation,
  'panels-top-left': LucidePanelsTopLeft,
  'square-dashed': LucideSquareDashed,
};

export const DEFAULT_WIDGET_TYPE = 'default';

const toDefinition = (widget: CatalogWidget): WidgetDefinition => ({
  type: widget.type,
  name: widget.name,
  icon: WIDGET_ICONS[widget.icon ?? ''] ?? LucideComponent,
  defaultProps: catalogDefaults(widget),
  component: WIDGET_COMPONENTS[widget.type] ?? DefaultWidget,
});

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  ...Object.fromEntries(WIDGET_CATALOG.widgets.map((w) => [w.type, toDefinition(w)])),
  // For types missing from the catalog (e.g. ones removed since a page was saved)
  [DEFAULT_WIDGET_TYPE]: {
    type: DEFAULT_WIDGET_TYPE,
    name: 'Unknown Widget',
    icon: LucideComponent,
    defaultProps: {},
    component: DefaultWidget,
  },
};

/** The registry entry of a widget type (the fallback widget for unknown types). */
export const widgetDefinition = (type: string | undefined): WidgetDefinition =>
  WIDGET_REGISTRY[type ?? ''] ?? WIDGET_REGISTRY[DEFAULT_WIDGET_TYPE];

/** The sections of the component list, in order. */
export const PALETTE_CATEGORIES: PaletteCategory[] = WIDGET_CATALOG.categories;

/**
 * What the component list offers to drag onto the canvas, with the size it's dropped at.
 * Types marked `palette: false` (like the form) aren't offered, but saved pages still show them.
 */
export const PALETTE_ITEMS: PaletteItem[] = WIDGET_CATALOG.widgets
  .filter((w) => w.palette !== false)
  .map((w) => ({
    type: w.type,
    label: w.name,
    category: w.category ?? 'basic',
    keywords: w.keywords,
    ...w.size,
    resizable: w.resizable,
  }));

/** Widget types that can be resized on the canvas. */
export const RESIZABLE_WIDGET_TYPES: string[] = WIDGET_CATALOG.widgets.filter((w) => w.resizable).map((w) => w.type);
