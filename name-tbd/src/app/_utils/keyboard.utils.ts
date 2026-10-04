import { shortcutKeys } from '../_constants/keyboard-shortcuts.constants';

/** Whether the user is typing in a field (where single keys mustn't act as shortcuts). */
export function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (/INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable);
}

/**
 * Whether a key event is the given keys, e.g. "Alt+1", "Ctrl+S", "?" or "Delete". Ctrl also
 * matches ⌘ on a Mac. A letter matches the letter the key types, so Ctrl+Z is the key labelled Z on
 * any layout (on a German keyboard it sits where Y is on an English one); when the key types no
 * letter (⌥ on a Mac changes the character), its position counts. Digits match by position.
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
  if (/^[a-z]$/i.test(key)) {
    return /^[a-z]$/i.test(event.key) ? event.key.toLowerCase() === key.toLowerCase() : event.code === `Key${key.toUpperCase()}`;
  }
  return event.key === key;
}

/** Whether a key event is the shortcut with this id (see KEYBOARD_SHORTCUTS). */
export const matchesShortcut = (event: KeyboardEvent, id: string): boolean => {
  const keys = shortcutKeys(id);
  return !!keys && matchesKeys(event, keys);
};
