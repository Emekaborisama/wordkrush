import { describe, expect, it } from 'vitest';
import { ART_ICON_NAMES, GLYPH_ICON_NAMES, ICON_NAMES, isArtIcon } from './names';

const ART = [
  'coin', 'star', 'heart', 'flame', 'gear', 'trophy', 'gift', 'chest', 'clock', 'bulb', 'bomb', 'crown',
  'gem', 'medal1', 'medal2', 'medal3', 'crate', 'calendar', 'book', 'hand', 'scales', 'target', 'snowflake',
  'letters',
];

const GLYPHS = [
  'back', 'close', 'plus', 'check', 'play', 'pause', 'home', 'help', 'retry', 'share', 'lock', 'people',
  'user', 'sound', 'soundOff', 'vibrate', 'music', 'mail', 'shuffle', 'skip', 'arrowUp', 'arrowDown', 'eye',
  'magnifier', 'chart', 'bolt', 'flag', 'ruler', 'sparkle', 'settings',
];

describe('ICON_NAMES', () => {
  it('has no duplicates', () => {
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
  });

  it('contains every art and glyph name the screens were promised', () => {
    for (const name of [...ART, ...GLYPHS]) expect(ICON_NAMES).toContain(name);
    expect(ICON_NAMES).toHaveLength(ART.length + GLYPHS.length);
  });

  it('keeps the two families apart', () => {
    const art = new Set<string>(ART_ICON_NAMES);
    for (const name of GLYPH_ICON_NAMES) expect(art.has(name)).toBe(false);
    expect([...ART_ICON_NAMES].sort()).toEqual([...ART].sort());
    expect([...GLYPH_ICON_NAMES].sort()).toEqual([...GLYPHS].sort());
  });

  it('tells art from glyphs', () => {
    expect(isArtIcon('coin')).toBe(true);
    expect(isArtIcon('letters')).toBe(true);
    expect(isArtIcon('settings')).toBe(false);
    expect(isArtIcon('bolt')).toBe(false);
  });
});
