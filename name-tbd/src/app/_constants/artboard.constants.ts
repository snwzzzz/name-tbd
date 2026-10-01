import { GridStackOptions } from 'gridstack';

// The artboard is a 16:9 website viewport:
// 24 columns × 60px = 1440px wide, 18 rows × 45px = 810px tall.
// A typical button (w:2, h:1) has ~112 × 37px of content after the 4px margins.
export const ARTBOARD_WIDTH = 1440;
export const ARTBOARD_HEIGHT = 810;
export const GRID_COLUMNS = 24;
export const GRID_ROWS = 18;
export const CELL_HEIGHT = ARTBOARD_HEIGHT / GRID_ROWS;

export const CANVAS_MIN_ZOOM = 0.05;
export const CANVAS_MAX_ZOOM = 4;
/**
 * The blueprint grid behind the artboard, in artboard px: both sizes divide the artboard
 * (1440 × 810) evenly, so its edges sit on major lines. Minor lines fade out below this on-screen size.
 */
export const BACKDROP_GRID_MINOR = 18;
export const BACKDROP_GRID_MAJOR = 90;
export const BACKDROP_GRID_MIN_VISIBLE = 6;

/** Space kept around the artboard when fitting it into the viewport. */
export const CANVAS_FIT_PADDING = 56;

/** Elements the grids accept on drop: palette cards and widgets moved between grids. */
const ACCEPTED_WIDGETS = '.gs-drag-item, .grid-stack-item';

export const ROOT_GRID_OPTIONS: GridStackOptions = {
  column: GRID_COLUMNS,
  cellHeight: CELL_HEIGHT,
  margin: 4,
  // Fixed row count locks the canvas to exactly 16:9
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
    cellHeight: CELL_HEIGHT,
    // Children sit flush inside the container
    margin: 0,
    acceptWidgets: ACCEPTED_WIDGETS,
    disableResize: false,
    removable: false,
    mode: 'float',
  };
}

/** Widget types that can be resized on the canvas. */
export const RESIZABLE_WIDGET_TYPES = ['button', 'container', 'table', 'link', 'nav', 'detail'];
