import { isDark, mix, normalizeHex, readableOn, toneOf } from './color.utils';

describe('color utils', () => {
  it('reads typed hex colors, short or long, with or without #', () => {
    expect(normalizeHex('#0F6CBD')).toBe('#0f6cbd');
    expect(normalizeHex(' abc ')).toBe('#aabbcc');
    expect(normalizeHex('#12345')).toBeNull();
    expect(normalizeHex('blue')).toBeNull();
  });

  it('picks text that is readable on a background', () => {
    expect(isDark('#0f6cbd')).toBe(true);
    expect(isDark('#ffffff')).toBe(false);
    expect(isDark('#ffd700')).toBe(false);
    expect(readableOn('#1b1b1b')).toBe('#ffffff');
    expect(readableOn('#f5f5f5')).toBe('#242424');
    expect(readableOn('not a color')).toBe('#242424');
    // A mid blue: white reads better than the dark text (4.5 vs 3.5 contrast)
    expect(readableOn('#2876db')).toBe('#ffffff');
  });

  it('mixes colors, and finds a tone of a background that stands out on it', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#2f89ff', 'nope', 0.5)).toBeNull();
    expect(toneOf('#ffffff')).toBe('#dbdbdb');        // darker
    expect(toneOf('#2f89ff')).toBe('#2876db');        // darker blue
    expect(toneOf('#000000')).toBe('#323232');        // near-black: lighter
  });
});
