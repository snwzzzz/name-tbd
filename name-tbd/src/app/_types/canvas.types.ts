import { ComponentId } from './layout.types';

/** The right-click menu of the canvas: on a widget (it's then selected), or on the empty page (paste). */
export interface CanvasContextMenu {
  x: number;
  y: number;
  item?: { id: ComponentId; type: string };
}
