import { shortcutKeys } from '../_constants/keyboard-shortcuts.constants';

/** Whether the user is typing in a field (where single keys mustn't act as shortcuts). */
export function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (/INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable);
}

/**
 * Whether a key event is the given keys, e.g. "Alt+1", "Ctrl+S", "?" or "Delete". Ctrl also
 * matches ⌘ on a Mac. Letters and digits match by key position, so they work on any keyboard
 * layout and with ⌥ on a Mac (which changes the typed character).
 */
export function matchesKeys(event: KeyboardEvent, keys: string): boolean {
  const parts = keys.split('+');
  const key = parts.pop()!;
  const mods = new Set(parts.map((p) => p.toLowerCase()));

  if (key === '?') return event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey;

  if (mods.has('ctrl') !== (event.ctrlKey || event.metaKey)) return false;
  if (mods.has('alt') !== event.altKey) return false;
  if (mods.has('shift') !== event.shiftKey) return false;

  if (/^[0-9]$/.test(key)) return event.code === `Digit${key}` || event.code === `Numpad${key}`;
  if (/^[a-z]$/i.test(key)) return event.code === `Key${key.toUpperCase()}`;
  return event.key === key;
}

/** Whether a key event is the shortcut with this id (see KEYBOARD_SHORTCUTS). */
export const matchesShortcut = (event: KeyboardEvent, id: string): boolean => {
  const keys = shortcutKeys(id);
  return !!keys && matchesKeys(event, keys);
};
