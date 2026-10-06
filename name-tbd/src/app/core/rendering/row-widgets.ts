// Widgets that show a data source's rows and let visitors select them (TableSelectionService):
// the actions that work on "the selected row" (show detail, edit, delete, search) and forms that
// edit the selected row take any of them.

export const ROW_WIDGET_TYPES = ['table', 'list'];

export const isRowWidget = (type: string | undefined): boolean => ROW_WIDGET_TYPES.includes(type ?? '');
