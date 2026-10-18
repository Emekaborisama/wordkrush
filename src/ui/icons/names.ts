/**
 * Every `GameIcon` name, in two families. Kept apart from the drawings so the
 * list can be tested (and imported by pure code) without React Native.
 */

/**
 * Full-colour glossy art, cut like the kit's icon row (clock, star, heart,
 * coin, gear, gift, trophy, bomb): own palette, never recoloured.
 */
export const ART_ICON_NAMES = [
  'coin',
  'star',
  'heart',
  'flame',
  'gear',
  'trophy',
  'gift',
  'chest',
  'clock',
  'bulb',
  'bomb',
  'crown',
  'gem',
  'medal1',
  'medal2',
  'medal3',
  'crate',
  'calendar',
  'book',
  'hand',
  'scales',
  'target',
  'snowflake',
  'letters',
] as const;

/**
 * White, outlined glyphs for drawing on glossy buttons and in small chrome.
 * The outline takes the `color` prop. `bolt` and `sparkle` are gold-filled.
 */
export const GLYPH_ICON_NAMES = [
  'back',
  'close',
  'plus',
  'check',
  'play',
  'pause',
  'home',
  'help',
  'retry',
  'share',
  'lock',
  'people',
  'user',
  'sound',
  'soundOff',
  'vibrate',
  'music',
  'mail',
  'shuffle',
  'skip',
  'arrowUp',
  'arrowDown',
  'eye',
  'magnifier',
  'chart',
  'bolt',
  'flag',
  'ruler',
  'sparkle',
  'settings',
] as const;

export type ArtIconName = (typeof ART_ICON_NAMES)[number];
export type GlyphIconName = (typeof GLYPH_ICON_NAMES)[number];
export type IconName = ArtIconName | GlyphIconName;

/** Art first, then glyphs: the order the kit page shows them in. */
export const ICON_NAMES: readonly IconName[] = [...ART_ICON_NAMES, ...GLYPH_ICON_NAMES];

const ART = new Set<string>(ART_ICON_NAMES);

export function isArtIcon(name: IconName): name is ArtIconName {
  return ART.has(name);
}
