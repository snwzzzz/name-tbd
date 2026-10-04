import { matchesKeys } from './keyboard.utils';

const key = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);

describe('matchesKeys', () => {
  it('matches digits and letters by position, with exact modifiers', () => {
    expect(matchesKeys(key({ code: 'Digit2', key: '2', altKey: true }), 'Alt+2')).toBe(true);
    // ⌥2 on a Mac types another character, but it's still the 2 key
    expect(matchesKeys(key({ code: 'Digit2', key: '™', altKey: true }), 'Alt+2')).toBe(true);
    expect(matchesKeys(key({ code: 'Digit2', key: '2' }), 'Alt+2')).toBe(false);
    expect(matchesKeys(key({ code: 'Digit2', key: '2', altKey: true, shiftKey: true }), 'Alt+2')).toBe(false);
    expect(matchesKeys(key({ code: 'KeyP', key: 'p', altKey: true }), 'Alt+P')).toBe(true);
  });

  it('treats ⌘ like Ctrl', () => {
    expect(matchesKeys(key({ code: 'KeyS', key: 's', ctrlKey: true }), 'Ctrl+S')).toBe(true);
    expect(matchesKeys(key({ code: 'KeyS', key: 's', metaKey: true }), 'Ctrl+S')).toBe(true);
    expect(matchesKeys(key({ code: 'KeyS', key: 's' }), 'Ctrl+S')).toBe(false);
  });

  it('matches letters by what the key types, whatever the layout', () => {
    // German keyboard: the key labelled Z is where Y is on an English one
    expect(matchesKeys(key({ code: 'KeyY', key: 'z', ctrlKey: true }), 'Ctrl+Z')).toBe(true);
    expect(matchesKeys(key({ code: 'KeyY', key: 'z', ctrlKey: true }), 'Ctrl+Y')).toBe(false);
    expect(matchesKeys(key({ code: 'KeyY', key: 'Z', ctrlKey: true, shiftKey: true }), 'Ctrl+Shift+Z')).toBe(true);
    expect(matchesKeys(key({ code: 'KeyZ', key: 'y', ctrlKey: true }), 'Ctrl+Y')).toBe(true);
    // ⌥ on a Mac types another character: the key's position counts
    expect(matchesKeys(key({ code: 'KeyP', key: 'π', altKey: true }), 'Alt+P')).toBe(true);
  });

  it('matches "?" however it is typed, and named keys', () => {
    expect(matchesKeys(key({ key: '?', shiftKey: true }), '?')).toBe(true);
    expect(matchesKeys(key({ key: '?', ctrlKey: true }), '?')).toBe(false);
    expect(matchesKeys(key({ key: 'Delete' }), 'Delete')).toBe(true);
  });
});
