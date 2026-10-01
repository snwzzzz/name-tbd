import { GridStackOptions } from 'gridstack';

// The artboard is a desktop browser window's page area (2:1, like a 1920 × 1080 screen minus the
// taskbar and the browser's toolbars): 72 × 36 square cells of 20px = 1440 × 720px.
// Widget margins are 2px, so a typical button (w:5, h:2) has 96 × 36px of content.
export const CELL_SIZE = 20;
export const GRID_COLUMNS = 72;
export const GRID_ROWS = 36;
export const ARTBOARD_WIDTH = GRID_COLUMNS * CELL_SIZE;
export const ARTBOARD_HEIGHT = GRID_ROWS * CELL_SIZE;
/** Inset of a widget in its cells (each side), so neighbours keep a 4px gap. */
export const WIDGET_MARGIN = 2;

export const CANVAS_MIN_ZOOM = 0.05;
export const CANVAS_MAX_ZOOM = 4;
/**
 * The blueprint grid behind the artboard, in artboard px: both sizes divide the artboard
 * (1440 × 720) evenly, so its edges sit on major lines. Minor lines fade out below this on-screen size.
 */
export const BACKDROP_GRID_MINOR = CELL_SIZE;
export const BACKDROP_GRID_MAJOR = CELL_SIZE * 6;
export const BACKDROP_GRID_MIN_VISIBLE = 6;

/** Space kept around the artboard when fitting it into the viewport. */
export const CANVAS_FIT_PADDING = 56;

/** Elements the grids accept on drop: palette cards and widgets moved between grids. */
const ACCEPTED_WIDGETS = '.gs-drag-item, .grid-stack-item';

export const ROOT_GRID_OPTIONS: GridStackOptions = {
  column: GRID_COLUMNS,
  cellHeight: CELL_SIZE,
  margin: WIDGET_MARGIN,
  // Fixed row count locks the canvas to the artboard's height
  row: GRID_ROWS,
  // No responsive breakpoints, so the grid doesn't drop to 1 column when zoomed out
  columnOpts: { breakpoints: [] },
  acceptWidgets: ACCEPTED_WIDGETS,
  // Widgets stay exactly where dropped, no gravity packing
  mode: 'float',
  draggable: { handle: '.grid-stack-item-content' },
  disableResize: false,
  removable: false,
};

/** Options of a container's nested grid: as many columns and rows as the container is big. */
export function subGridOptions(rows: number): GridStackOptions {
  return {
    column: 'auto',
    row: rows,
    maxRow: rows,
    cellHeight: CELL_SIZE,
    // Children sit flush inside the container
    margin: 0,
    acceptWidgets: ACCEPTED_WIDGETS,
    disableResize: false,
    removable: false,
    mode: 'float',
  };
}
