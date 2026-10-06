/** Props of a placed widget, as stored in the backend. */
export type WidgetProps = Record<string, unknown>;

/**
 * Id of a placed component: a number once it's saved in the backend, a temporary string (`new_…`,
 * see IdRegistry) until then.
 */
export type ComponentId = number | string;

/** A widget on the page, with its nested children (containers). */
export interface LayoutItem {
  id?: ComponentId;
  parentId?: ComponentId;
  type?: string;
  props?: WidgetProps;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  children?: LayoutItem[];
}

/** Position and size of a placed widget, in grid cells. */
export interface GridGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
  parentId?: ComponentId;
}

/** New props for a live widget on the canvas. */
export interface PropPatch {
  id: string;
  props: WidgetProps;
}
