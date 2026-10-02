// Events widgets fire on a previewed page, which can start a flow (see WIDGET_TRIGGERS).
// Kept apart from workflow.constants, so widgets don't pull in the workflow actions.

/** The event a button's click trigger listens to. */
export const CLICK_EVENT = 'element_click';

/** The event a data table fires when one of its rows is double-clicked (the row is selected first). */
export const ROW_DOUBLE_CLICK_EVENT = 'row_dblclick';

/** The event an input fires when its text changed: once typing pauses (its debounce), or at once on Enter. */
export const INPUT_EVENT = 'input_change';
