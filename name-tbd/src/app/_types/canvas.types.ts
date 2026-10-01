import { ComponentId } from './layout.types';

/** The right-click menu of a widget on the canvas. */
export interface CanvasContextMenu {
  x: number;
  y: number;
  item: { id: ComponentId; type: string };
}
