/**
 * Design tokens.
 *
 * The lockup (`brand`) is unchanged: the wordmark is not recoloured.
 *
 * Every screen follows the Block Blast UI kit (owner decision, 2026-10-18 —
 * see docs/DESIGN_SYSTEM.md). Sky backdrop, coral popups with a white rim and
 * a teal ribbon title, cream inset boxes, glossy rounded-rectangle buttons,
 * cream HUD panels with red tabs, a cyan board, and a green booster dock.
 * The sand / wood chrome from earlier on 2026-10-18 is superseded.
 */

/**
 * Lockup colours from docs/branding/color.md. These paint the logo only.
 * Screen chrome does not alias them.
 */
export const brand = {
  ink: '#0A0817',
  word: '#FFF9F6',
  krush: '#FFB020',
  krushHot: '#FF8C00',
  purple: '#8B6BFF',
  purpleDeep: '#2E0854',
} as const;

/**
 * Block Blast's five "main colors", exactly as the kit names them.
 * Everything in `palette` is either one of these or sampled from the kit's
 * screens (gradient ends, rims, lips), so screens never invent a one-off.
 */
export const kit = {
  coral: '#F15D70',
  sky: '#6BB9E0',
  cream: '#FFE1BE',
  green: '#62AC25',
  teal: '#2DADBD',
} as const;

export const palette = {
  ...kit,
  white: '#FFFFFF',

  // Popup panel: light salmon at the top, the kit coral in the middle,
  // deeper coral at the foot. White 4px rim, coral keyline just inside it.
  coralTop: '#FB8F99',
  coralBottom: '#E6556A',
  coralEdge: '#C43C53',

  // Cream inset box (Music / SFX, Goal, level rows) and its rim.
  creamFill: '#FFEAD3',
  creamEdge: '#EEC39B',
  creamShade: '#F7D5B3',

  // Menu backdrop: deep sky at the top, pale horizon under the clouds.
  navy: '#285FAD',
  navyDeep: '#173F7E',
  skyTop: '#2F7FDB',
  skyMid: '#58AEEA',
  skyBottom: '#B8EAF8',
  cloudShade: '#D3EFFA',

  // Play field: lighter cyan sky, cyan board frame, pale empty cells,
  // light tray and the translucent booster dock.
  playTop: '#41B2E1',
  playBottom: '#97DEF2',
  frame: '#38C5EA',
  frameDeep: '#179BC8',
  well: '#C2EEFA',
  tray: '#ABE5F5',
  dock: '#D8F4FC',

  // Ink. Navy on cream / white; teal for the kit's labels on cream.
  ink: '#173A63',
  inkSoft: '#3D5D85',
  tealInk: '#0E6874',

  // Accents.
  red: '#EF3E4F',
  redDeep: '#B21F38',
  gold: '#FFC928',
  goldDeep: '#F29A0B',
  goldEdge: '#A85A00',
  orange: '#FFB31F',
  blue: '#2EB4EC',
  purple: '#9C5BEF',
  pink: '#FF7EB6',
  lime: '#8BD43A',

  /**
   * @deprecated Sand / wood names, kept only while screens migrate to the
   * Block Blast tokens above. Each maps to its Block Blast counterpart.
   */
  sand: '#F7D5B3',
  /** @deprecated */
  wood: '#179BC8',
  /** @deprecated */
  plank: '#38C5EA',
  /** @deprecated */
  paper: '#FFEAD3',
  /** @deprecated */
  brown: '#173A63',
  /** @deprecated */
  brownMuted: '#3D5D85',
  /** @deprecated */
  brownSoft: '#3D5D85',
  /** @deprecated */
  greenBevel: '#2F8012',
  /** @deprecated */
  ribbon: '#FFC928',
  /** @deprecated */
  star: '#FFC928',
  /** @deprecated */
  starEdge: '#F29A0B',
} as const;

/**
 * Cube colours for `BlockTile`, the logo and the level digits. The kit's
 * boards use these seven, plus cream for letter tiles and stone for locked
 * cells.
 */
export const cube = {
  red: '#FF5D6E',
  orange: '#FFA23A',
  yellow: '#FFCD38',
  green: '#7BD453',
  teal: '#35CFC6',
  blue: '#3E9BFF',
  purple: '#A46BF5',
  pink: '#FF86C3',
  cream: '#FFF2DF',
  stone: '#9DB2C8',
  gold: '#FFD447',
} as const;

export type CubeColor = keyof typeof cube;

/** Glossy face: light top, saturated foot, darker lip, darkest outline. */
export type GlossTone = {
  top: string;
  bottom: string;
  lip: string;
  outline: string;
};

/**
 * Button faces sampled from the kit (Connect, Terms, Contact us, Play) and
 * extended to the other accents. `outline` also strokes the white label.
 */
export const tone = {
  green: { top: '#A3E63A', bottom: '#4AB41F', lip: '#2F8012', outline: '#245F0C' },
  blue: { top: '#93EEFB', bottom: '#2EB9E6', lip: '#1A86B8', outline: '#11628A' },
  gold: { top: '#FFE53D', bottom: '#F4A91E', lip: '#C97905', outline: '#8C4F00' },
  red: { top: '#FF8E8E', bottom: '#EC3D4F', lip: '#B2223A', outline: '#7F1428' },
  purple: { top: '#D2A6FF', bottom: '#9558EC', lip: '#6634BE', outline: '#4A2190' },
  teal: { top: '#A0E6EC', bottom: '#30BFCB', lip: '#1C8C98', outline: '#126771' },
  coral: { top: '#FFA2A6', bottom: '#F15D70', lip: '#C33B52', outline: '#8C2438' },
  sky: { top: '#A9E6FF', bottom: '#4FA9EC', lip: '#2B78C2', outline: '#1B5592' },
  grey: { top: '#EEF2F6', bottom: '#AEB9C6', lip: '#808C9A', outline: '#5B6676' },
} as const satisfies Record<string, GlossTone>;

export type Tone = keyof typeof tone;

/** Bevel lip heights in px, by control size. */
export const bevel = { lg: 6, md: 5, sm: 4, shadeAmount: 0.3 } as const;

/** Top highlight band on a glossy face. */
export const gloss = { alpha: 0.26, height: 0.48 } as const;

/** 1px top inner rim. */
export const rim = { alpha: 0.45 } as const;

/** Smallest size for text that must clear WCAG AA (under 18px). */
export const labelFloorPx = 11;

function normalizeHex(hex: string): string {
  const raw = hex.trim().replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`expected a hex colour, received ${hex}`);
  }
  return `#${full.toUpperCase()}`;
}

function channels(hex: string): [number, number, number] {
  const n = parseInt(normalizeHex(hex).slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const byte = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

function mixHex(hex: string, toward: [number, number, number], amount: number): string {
  const t = Math.max(0, Math.min(1, amount));
  const [r, g, b] = channels(hex);
  return toHex(r + (toward[0] - r) * t, g + (toward[1] - g) * t, b + (toward[2] - b) * t);
}

/** Mix `hex` toward black. `amount` 0 returns the colour; 1 returns black. */
export function shade(hex: string, amount: number): string {
  return mixHex(hex, [0, 0, 0], amount);
}

/** Mix `hex` toward white. `amount` 0 returns the colour; 1 returns white. */
export function tint(hex: string, amount: number): string {
  return mixHex(hex, [255, 255, 255], amount);
}

function srgbChannel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex);
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

/** WCAG contrast ratio. Order does not matter. Hex colours only. */
export function contrastRatio(fg: string, bg: string): number {
  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Colour + 0–1 alpha -> the same colour, translucent. Keeps tint math in one
 * place.
 *
 * Handles both colour formats the app actually produces: hex (`#rrggbb` ->
 * `#rrggbbaa`) and the `hsl()` strings from `proximityColor` (-> `hsla()`).
 * The hsl branch is not decoration: a hex alpha suffix cannot be concatenated
 * onto `hsl(...)`, and the invalid result renders FULLY OPAQUE rather than
 * failing loudly — which is how a guess row's rank text once ended up the exact
 * colour of the pill behind it.
 */
export function withAlpha(color: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  if (color.startsWith('hsl(')) {
    return `hsla(${color.slice(4, -1)}, ${clamped})`;
  }
  const a = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
  return `${color}${a}`;
}

/**
 * A glossy tone derived from any hex, for the rare control whose colour is
 * data (a game accent) rather than one of the named `tone`s.
 */
export function toneFrom(hex: string): GlossTone {
  const base = normalizeHex(hex);
  return {
    top: tint(base, 0.42),
    bottom: base,
    lip: shade(base, bevel.shadeAmount),
    outline: shade(base, 0.5),
  };
}

/** @deprecated Pill names from the sand chrome. Use `tone` and `Button`'s `tone`. */
export type PillTone = 'green' | 'purple' | 'blue' | 'coral' | 'ribbon';

/** @deprecated */
export type PillChrome = { face: string; bevel: string; label: string };

const PILL_TO_TONE: Record<PillTone, Tone> = {
  green: 'green',
  purple: 'purple',
  blue: 'blue',
  coral: 'red',
  ribbon: 'gold',
};

/** Maps a legacy pill name onto its Block Blast tone. */
export function toneForPill(name: PillTone): Tone {
  return PILL_TO_TONE[name];
}

/** @deprecated Use `tone` / `toneFrom`. */
export function pillChrome(hex: string, _label: 'white' | 'brown' = 'white'): PillChrome {
  const glossy = toneFrom(hex);
  return { face: glossy.bottom, bevel: glossy.lip, label: palette.white };
}

/** @deprecated Use `tone`. */
export const pillTone: Record<PillTone, string> = {
  green: tone.green.bottom,
  purple: tone.purple.bottom,
  blue: tone.blue.bottom,
  coral: tone.red.bottom,
  ribbon: tone.gold.bottom,
};

/** @deprecated Use `tone`. */
export const pill: Record<PillTone, PillChrome> = {
  green: { face: tone.green.bottom, bevel: tone.green.lip, label: palette.white },
  purple: { face: tone.purple.bottom, bevel: tone.purple.lip, label: palette.white },
  blue: { face: tone.blue.bottom, bevel: tone.blue.lip, label: palette.white },
  coral: { face: tone.red.bottom, bevel: tone.red.lip, label: palette.white },
  ribbon: { face: tone.gold.bottom, bevel: tone.gold.lip, label: palette.white },
};

export const reward = {
  gold: palette.gold,
  goldHot: palette.goldDeep,
  outline: palette.goldEdge,
  /** Unearned star on a coral panel: a darker coral silhouette, as in the kit. */
  starOff: palette.coralEdge,
  /** Unearned star on cream or white. */
  starOffLight: palette.creamEdge,
  xp: palette.purple,
} as const;

export const theme = {
  /** Behind everything; the sky paints over it. */
  bg: palette.navy,
  bgElevated: palette.creamFill,
  card: palette.creamFill,
  cardHigh: palette.white,
  edge: withAlpha(palette.ink, 0.12),
  border: palette.creamEdge,
  borderStrong: shade(palette.creamEdge, 0.18),
  /** Navy ink on cream or white. On sky or coral, text is white and outlined. */
  text: palette.ink,
  textMuted: palette.inkSoft,
  textDim: palette.inkSoft,
  /** White text on coral, sky, and glossy faces (always outlined). */
  onColor: palette.white,
  onPill: palette.white,
  accent: palette.green,
  accentSoft: withAlpha(palette.green, 0.16),
  accentDim: withAlpha(palette.green, 0.22),
  accentSecondary: palette.purple,
  accentSecondarySoft: withAlpha(palette.purple, 0.16),
  success: palette.green,
  successSoft: withAlpha(palette.green, 0.16),
  successDim: tone.green.lip,
  danger: palette.red,
  dangerSoft: withAlpha(palette.red, 0.16),
  dangerDim: palette.redDeep,
  warning: palette.gold,
  warningSoft: withAlpha(palette.gold, 0.24),
  violet: palette.purple,
  violetSoft: withAlpha(palette.purple, 0.16),
  /** Dark-blue scrim behind a popup. */
  overlay: 'rgba(14, 38, 84, 0.62)',
  /** @deprecated Text on the old wood playfield; white on the new cyan one. */
  onWood: palette.white,
  /** @deprecated Inset score well. */
  well: palette.ink,
  /** @deprecated */
  wood: palette.frameDeep,
  /** @deprecated */
  plank: palette.frame,
} as const;

/**
 * Page fills. `SkyBackground` paints the real sky; these are the solid
 * fallbacks a root view uses so nothing flashes white before it draws.
 */
export const screen = {
  page: { flex: 1, backgroundColor: palette.skyMid },
  playfield: { flex: 1, backgroundColor: palette.playTop },
} as const;

export const radius = { sm: 12, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export const space = { xxs: 2, xs: 5, sm: 9, md: 14, lg: 20, xl: 28, xxl: 40, hero: 56 } as const;

/**
 * Exo 2 stands in for the kit's Neuron (commercial): the same squarish,
 * chunky letterforms. Black for headlines, buttons, ribbons and numbers;
 * Bold for descriptions; ExtraBold for small labels.
 *
 * Never pair these with `fontWeight`. Each weight is its own family, and on
 * web a `fontWeight` above the registered 400 makes the browser fake a bolder
 * face on top of an already heavy one.
 *
 * `medium` / `semibold` / `bold` are the names screens used before the
 * rebuild; they map onto the nearest Exo 2 face.
 */
export const font = {
  body: 'Exo2_700Bold',
  heavy: 'Exo2_800ExtraBold',
  black: 'Exo2_900Black',
  medium: 'Exo2_600SemiBold',
  semibold: 'Exo2_700Bold',
  bold: 'Exo2_800ExtraBold',
} as const;

/**
 * Interaction constants. One pressed-state and one touch-target minimum for
 * the whole app, so `PressableScale` is the only place that decides what a
 * tap looks like.
 *
 * Bevel buttons do not use `pressedTranslateY`. The face itself moves by its
 * lip. See `GlossFace`.
 */
export const interaction = {
  pressedOpacity: 0.9,
  pressedScale: 0.96,
  pressedTranslateY: 3,
  minTouch: 44,
} as const;

/**
 * Depth for the legacy `Surface`. Level 0 is the backdrop; 1–3 are cream
 * boxes that get lighter as they come forward.
 */
const CREAM_ELEVATION = [
  { backgroundColor: palette.skyMid, borderColor: withAlpha(palette.white, 0.35), borderTopColor: withAlpha(palette.white, 0.6) },
  { backgroundColor: palette.creamShade, borderColor: palette.creamEdge, borderTopColor: tint(palette.creamShade, 0.4) },
  { backgroundColor: palette.creamFill, borderColor: palette.creamEdge, borderTopColor: palette.white },
  { backgroundColor: palette.white, borderColor: palette.creamEdge, borderTopColor: palette.white },
] as const;

const FRAME_ELEVATION = [
  { backgroundColor: palette.frameDeep, borderColor: shade(palette.frameDeep, 0.2), borderTopColor: withAlpha(palette.white, 0.25) },
  { backgroundColor: palette.frame, borderColor: palette.frameDeep, borderTopColor: withAlpha(palette.white, 0.4) },
  { backgroundColor: palette.well, borderColor: palette.frameDeep, borderTopColor: palette.white },
  { backgroundColor: palette.white, borderColor: palette.frame, borderTopColor: palette.white },
] as const;

export function elevation(level: 0 | 1 | 2 | 3, surface: 'cream' | 'frame' | 'paper' | 'wood' = 'cream') {
  return (surface === 'frame' || surface === 'wood' ? FRAME_ELEVATION : CREAM_ELEVATION)[level];
}

/**
 * Derives a game's full accent ramp from its one registry hex, so a hub card,
 * an active nav item, and a CTA button all agree on what "this game's colour"
 * means without each screen recomputing an alpha tint by hand.
 */
export function gameAccentTokens(accent: string) {
  return {
    accent,
    /** Tinted fill — art tiles, active rows. */
    soft: withAlpha(accent, 0.16),
    /** Soft wash of the accent, for a tonal control on cream. */
    dim: withAlpha(accent, 0.22),
    /** Same hex as the border colour of an accented outline control. */
    border: accent,
    /** Broad ambient colour used behind key art, never behind body copy. */
    glow: withAlpha(accent, 0.28),
    /** Navy body ink on cream. */
    ink: palette.ink,
  } as const;
}

/**
 * Numbers in a vertical list must use tabular figures, or digits of different
 * widths make the column visibly ragged as ranks change.
 */
export const numeric = {
  fontVariant: ['tabular-nums'] as const,
};

export const frame = {
  /** Full-bleed below `wideMin`; laptop column cap above it. */
  wideMin: 720,
  maxWidth: 1080,
} as const;

/**
 * Type scale. Exo 2 only — see `font`. No `fontWeight` anywhere.
 */
export const type = {
  hero: { fontFamily: font.black, fontSize: 44, letterSpacing: -0.4, lineHeight: 50 },
  displayXL: { fontFamily: font.black, fontSize: 40, letterSpacing: -0.3, lineHeight: 46 },
  display: { fontFamily: font.black, fontSize: 32, letterSpacing: -0.2, lineHeight: 38 },
  title: { fontFamily: font.black, fontSize: 24, letterSpacing: 0, lineHeight: 29 },
  subtitle: { fontFamily: font.heavy, fontSize: 18, letterSpacing: 0, lineHeight: 23 },
  body: { fontFamily: font.body, fontSize: 15, letterSpacing: 0, lineHeight: 21 },
  bodyStrong: { fontFamily: font.heavy, fontSize: 15, letterSpacing: 0, lineHeight: 21 },
  caption: { fontFamily: font.body, fontSize: 13, letterSpacing: 0, lineHeight: 18 },
  /** Small labels. Floor is 11px so they clear AA on cream. */
  overline: { fontFamily: font.heavy, fontSize: labelFloorPx, letterSpacing: 1.1, lineHeight: 14 },
} as const;

/**
 * Soft, layered shadows. A single hard shadow reads as a drop-shadow filter;
 * real depth needs a tight contact shadow plus a wide ambient one.
 */
export const shadow = {
  card: {
    shadowColor: '#0B2A5C',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  raised: {
    shadowColor: '#0B2A5C',
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 13,
  },
  glow: {
    shadowColor: palette.gold,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 9,
  },
} as const;

/**
 * Motion.
 *
 * Springs, not linear timings — physical motion is what separates an interface
 * that feels built from one that feels animated. `gentle` is for surfaces
 * entering, `snappy` for direct responses to a tap. Pop-ins use
 * `Easing.out(Easing.back(1.6))` over `popMs`.
 */
export const motion = {
  gentle: { damping: 18, stiffness: 145, mass: 0.9 },
  snappy: { damping: 17, stiffness: 290, mass: 0.66 },
  celebratory: { damping: 12, stiffness: 190, mass: 0.72 },
  fastMs: 150,
  standardMs: 240,
  /** Duration for value counting, which should feel deliberate, not instant. */
  countMs: 620,
  pressMs: 70,
  popMs: 260,
  staggerMs: 140,
  countXpMs: 900,
  rayPeriodMs: 30000,
  shakeMs: 320,
  coinFlyMs: 650,
  burstMs: 900,
} as const;

export function formatValue(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/**
 * Milliseconds as `m:ss`.
 *
 * Rounds rather than floors so it reads correctly in both directions: a
 * countdown shows a full `1:15` on the first frame instead of `1:14`, and an
 * elapsed time of 43.4s still reads `0:43`.
 */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Continuous cold -> hot scale for guess proximity.
 *
 * `fraction` is 0 (ice cold) to 1 (the answer). Hue sweeps 210° (slate blue)
 * through 40° (amber) to 145° (green). Interpolating rather than bucketing
 * means the bar reads as a temperature gradient, which is the whole point of
 * the mechanic: you should feel yourself getting warmer.
 */
export function proximityColor(fraction: number): string {
  const t = Math.max(0, Math.min(1, fraction));
  let hue: number;
  let saturation: number;
  let lightness: number;

  if (t < 0.45) {
    // Cold half: slate blue -> red. Desaturated at the bottom so a wrong guess
    // never shouts louder than a good one.
    const k = t / 0.45;
    hue = 213 - 213 * k;
    saturation = 24 + 46 * k;
    lightness = 40 + 18 * k;
  } else if (t < 0.78) {
    // Warming: red -> amber.
    const k = (t - 0.45) / 0.33;
    hue = 0 + 42 * k;
    saturation = 70 + 12 * k;
    lightness = 58;
  } else {
    // Hot: amber -> green.
    const k = (t - 0.78) / 0.22;
    hue = 42 + 103 * k;
    saturation = 82 - 12 * k;
    lightness = 58 - 8 * k;
  }
  return `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`;
}
