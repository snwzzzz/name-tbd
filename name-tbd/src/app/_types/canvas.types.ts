import { ComponentId } from './layout.types';

/** The right-click menu of a widget on the canvas. */
export interface CanvasContextMenu {
  x: number;
  y: number;
  item: { id: ComponentId; type: string };
}

export type SidebarTab = 'components' | 'layers';
export type InspectorTab = 'edit' | 'layers';
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
