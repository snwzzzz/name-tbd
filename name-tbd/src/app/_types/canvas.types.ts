import { ComponentId } from './layout.types';

/** The right-click menu of a widget on the canvas. */
export interface CanvasContextMenu {
  x: number;
  y: number;
  item: { id: ComponentId; type: string };
}

/** The id of one of the SIDEBAR_TABS. */
export type SidebarTab = string;
export type InspectorTab = 'edit' | 'layers';
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
