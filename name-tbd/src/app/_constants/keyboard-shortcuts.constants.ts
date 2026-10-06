/** A keyboard shortcut: its keys (e.g. "Alt+1", see matchesShortcut) and what it does. */
export interface KeyboardShortcut {
  id: string;
  keys: string;
  description: string;
}

/**
 * The editor's keyboard shortcuts, as the shortcut overview lists them. Each is handled where its
 * action lives (the editor shell, the canvas), matched by id. A new one is added here and there.
 */
export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { id: 'mode-edit', keys: 'Alt+1', description: 'Edit mode' },
  { id: 'mode-workflow', keys: 'Alt+2', description: 'Workflow mode' },
  { id: 'mode-data', keys: 'Alt+3', description: 'Data mode' },
  { id: 'preview', keys: 'Alt+P', description: 'Start or stop the preview (Edit mode)' },
  { id: 'undo', keys: 'Ctrl+Z', description: 'Undo the last change on the page' },
  { id: 'redo', keys: 'Ctrl+Shift+Z', description: 'Redo' },
  { id: 'redo-y', keys: 'Ctrl+Y', description: 'Redo' },
  { id: 'save', keys: 'Ctrl+S', description: 'Save changes now' },
  { id: 'new-tab', keys: 'Alt+N', description: 'New tab' },
  { id: 'close-tab', keys: 'Alt+W', description: 'Close the tab' },
  { id: 'toggle-left-sidebar', keys: 'Ctrl+B', description: 'Show or hide the left sidebar' },
  { id: 'delete', keys: 'Delete', description: 'Delete the selected widgets (Edit mode)' },
  { id: 'copy', keys: 'Ctrl+C', description: 'Copy the selected widgets (Edit mode)' },
  { id: 'paste', keys: 'Ctrl+V', description: 'Paste copied widgets, onto any page (Edit mode)' },
  { id: 'duplicate', keys: 'Ctrl+D', description: 'Duplicate the selected widgets (Edit mode)' },
  { id: 'help', keys: '?', description: 'Show these shortcuts' },
];

/** The keys of a shortcut, e.g. for a tooltip. */
export const shortcutKeys = (id: string): string => KEYBOARD_SHORTCUTS.find((s) => s.id === id)?.keys ?? '';
