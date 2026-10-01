// The widget catalog: the one registry of widget types, shared with the backend
// (shared/widget-catalog.json at the repository root). Widget components register against it
// (widget-registry.constants.ts); the editor's palette and settings, and the exported app, read it.
import catalogJson from '../../../../../shared/widget-catalog.json';

export interface CatalogCategory {
  id: string;
  label: string;
}

/** A setting of a widget. Values are stored as text, so its default is text too. */
export interface CatalogProp {
  key: string;
  type: string;
  label?: string;
  group?: string;
  default?: string;
  options?: string[];
}

export interface CatalogWidget {
  type: string;
  name: string;
  /** A Lucide icon name, e.g. "mouse-pointer-click" (see WIDGET_ICONS). */
  icon?: string;
  category?: string;
  keywords?: string[];
  size: { w: number; h: number; minW?: number; minH?: number };
  resizable?: boolean;
  /** False for widget types that are no longer offered (saved pages still show them). */
  palette?: boolean;
  /** Holds other widgets (the canvas gives it a nested grid). */
  container?: boolean;
  props: CatalogProp[];
}

export interface WidgetCatalog {
  version: number;
  categories: CatalogCategory[];
  widgets: CatalogWidget[];
}

export const WIDGET_CATALOG = catalogJson as WidgetCatalog;

export const catalogWidget = (type: string | undefined): CatalogWidget | undefined =>
  WIDGET_CATALOG.widgets.find((w) => w.type === type);

/** A widget type's props with their default values (as stored: text). */
export function catalogDefaults(widget: CatalogWidget): Record<string, string> {
  return Object.fromEntries(widget.props.map((p) => [p.key, p.default ?? '']));
}
