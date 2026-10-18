/**
 * Design tokens.
 *
 * The lockup (`brand`) is unchanged: the wordmark is not recoloured.
 *
 * Screens use the 2026-10-18 casual chrome (`palette`, `theme`, `screen`).
 * Sand page, wood playfield, warm-white cards, glossy pills. The flat dark
 * ink canvas is not the default. See docs/branding/color.md.
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
 * Owner hexes for the casual-game chrome (2026-10-18). Named here so screens
 * never invent a one-off. `starEdge` is the orange star outline from the
 * reference shots; the brief names the colour but not a hex.
 *
 * `brownMuted` / `brownSoft` are label browns. The bright pills fail as small
 * text on sand and paper, so secondary labels use these instead of opacity.
 */
export const palette = {
  sand: '#F4E4C4',
  wood: '#6B3E26',
  plank: '#8B5A2B',
  paper: '#FFF8EE',
  brown: '#3A2415',
  brownMuted: '#6B4630',
  brownSoft: '#7A5340',
  white: '#FFFFFF',
  green: '#3DCC4A',
  greenBevel: '#1E8A28',
  purple: '#7B4FD6',
  blue: '#2F9BFF',
  coral: '#FF5A7A',
  ribbon: '#FFC83D',
  star: '#FFC107',
  starEdge: '#E8780C',
} as const;

export const bevel = { lg: 6, md: 5, sm: 4, shadeAmount: 0.38 } as const;

/** Top highlight on a glossy face. */
export const gloss = { alpha: 0.18, height: 0.46 } as const;

/** 1px top inner rim. */
export const rim = { alpha: 0.35 } as const;

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
 * White on `#3DCC4A` is about 2.11:1, and a 0.18 white gloss makes the top of
 * the face even lighter. A white label needs a deeper shade of the same hue
 * so the glyphs still clear 4.5:1 where the gloss sits.
 */
export function readableWhiteFace(hex: string): string {
  const base = normalizeHex(hex);
  const clears = (face: string) => contrastRatio(palette.white, tint(face, gloss.alpha)) >= 4.5;
  if (clears(base)) return base;
  for (let step = 1; step <= 100; step += 1) {
    const face = shade(base, step / 100);
    if (clears(face)) return face;
  }
  return shade(base, 1);
}

export type PillLabel = 'white' | 'brown';

export type PillChrome = {
  face: string;
  bevel: string;
  label: string;
};

/** Face, darker lip, and a label colour that clears 4.5:1 on that face. */
export function pillChrome(hex: string, label: PillLabel): PillChrome {
  if (label === 'brown') {
    const face = normalizeHex(hex);
    return { face, bevel: shade(face, bevel.shadeAmount), label: palette.brown };
  }
  const face = readableWhiteFace(hex);
  return { face, bevel: shade(face, bevel.shadeAmount), label: palette.white };
}

export const pillTone = {
  green: palette.green,
  purple: palette.purple,
  blue: palette.blue,
  coral: palette.coral,
  ribbon: palette.ribbon,
} as const;

export type PillTone = keyof typeof pillTone;

/** Precomputed chrome for the five reference pills. */
export const pill: Record<PillTone, PillChrome> = {
  green: pillChrome(palette.green, 'white'),
  purple: pillChrome(palette.purple, 'white'),
  blue: pillChrome(palette.blue, 'white'),
  coral: pillChrome(palette.coral, 'white'),
  ribbon: pillChrome(palette.ribbon, 'brown'),
};

export const reward = {
  gold: palette.star,
  goldHot: palette.starEdge,
  outline: palette.brown,
  /** Unearned star. Sand reads on a warm-white card; it is a glyph, not body text. */
  starOff: palette.sand,
  xp: palette.purple,
} as const;

export const theme = {
  bg: palette.sand,
  bgElevated: palette.paper,
  card: palette.paper,
  cardHigh: tint(palette.paper, 0.55),
  edge: 'rgba(58,36,21,0.10)',
  border: shade(palette.sand, 0.12),
  borderStrong: shade(palette.sand, 0.28),
  text: palette.brown,
  textMuted: palette.brownMuted,
  textDim: palette.brownSoft,
  /** Text on the wood playfield. */
  onWood: palette.paper,
  /** Text on a contrast-safe saturated pill. */
  onPill: palette.white,
  /** Inset best / score well. */
  well: palette.brown,
  accent: palette.green,
  accentSoft: withAlpha(palette.green, 0.16),
  accentDim: withAlpha(palette.green, 0.22),
  accentSecondary: palette.purple,
  accentSecondarySoft: withAlpha(palette.purple, 0.16),
  success: palette.green,
  successSoft: withAlpha(palette.green, 0.16),
  successDim: palette.greenBevel,
  danger: palette.coral,
  dangerSoft: withAlpha(palette.coral, 0.16),
  dangerDim: shade(palette.coral, 0.35),
  warning: palette.star,
  warningSoft: withAlpha(palette.star, 0.22),
  violet: palette.purple,
  violetSoft: withAlpha(palette.purple, 0.16),
  wood: palette.wood,
  plank: palette.plank,
  overlay: 'rgba(58,36,21,0.46)',
} as const;

/**
 * Page and playfield fills. Screens apply one of these instead of painting
 * their own canvas. `theme.bg` is the same sand, so existing page roots that
 * already use it leave the ink background behind.
 */
export const screen = {
  page: { flex: 1, backgroundColor: palette.sand },
  playfield: { flex: 1, backgroundColor: palette.wood },
} as const;

export const radius = { sm: 12, md: 18, lg: 28, xl: 36, pill: 999 } as const;

export const space = { xxs: 2, xs: 5, sm: 9, md: 14, lg: 20, xl: 28, xxl: 40, hero: 56 } as const;

/**
 * Bundled, offline faces. Every text tier in the scale below uses one of these,
 * so the app reads as one typeface across all three games (D-027, superseding
 * D-026's display-only split).
 *
 * Symbol glyphs (✓ ✎ ◎ ⟷ ▤ ★ ≡ ‹) are deliberately NOT given a `fontFamily` —
 * Fredoka is a Latin display face and does not contain them, so naming it would
 * force a silent per-platform fallback at best and tofu at worst.
 */
export const font = {
  medium: 'Fredoka_500Medium',
  semibold: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
} as const;

/**
 * Interaction constants. One pressed-state and one touch-target minimum for
 * the whole app, so `PressableScale` is the only place that decides what a
 * tap looks like — screens stop inventing their own opacity value.
 *
 * Bevel buttons do not use `pressedTranslateY`. The face itself moves by its
 * bevel. See `BevelFace`.
 */
export const interaction = {
  pressedOpacity: 0.9,
  pressedScale: 0.97,
  pressedTranslateY: 3,
  minTouch: 44,
} as const;

const PAPER_ELEVATION = [
  { backgroundColor: palette.sand, borderColor: shade(palette.sand, 0.08), borderTopColor: 'rgba(255,255,255,0.55)' },
  { backgroundColor: tint(palette.sand, 0.4), borderColor: shade(palette.sand, 0.1), borderTopColor: 'rgba(255,255,255,0.7)' },
  { backgroundColor: palette.paper, borderColor: shade(palette.sand, 0.12), borderTopColor: 'rgba(255,255,255,0.9)' },
  { backgroundColor: tint(palette.paper, 0.55), borderColor: shade(palette.sand, 0.16), borderTopColor: palette.white },
] as const;

const WOOD_ELEVATION = [
  { backgroundColor: palette.wood, borderColor: shade(palette.wood, 0.25), borderTopColor: 'rgba(255,248,238,0.16)' },
  { backgroundColor: tint(palette.wood, 0.08), borderColor: shade(palette.wood, 0.2), borderTopColor: 'rgba(255,248,238,0.22)' },
  { backgroundColor: palette.plank, borderColor: shade(palette.plank, 0.18), borderTopColor: 'rgba(255,248,238,0.28)' },
  { backgroundColor: tint(palette.plank, 0.14), borderColor: shade(palette.plank, 0.12), borderTopColor: 'rgba(255,248,238,0.36)' },
] as const;

export function elevation(level: 0 | 1 | 2 | 3, surface: 'paper' | 'wood' = 'paper') {
  return (surface === 'wood' ? WOOD_ELEVATION : PAPER_ELEVATION)[level];
}

/**
 * Derives a game's full accent ramp from its one registry hex, so a hub card,
 * an active nav item, and a CTA button all agree on what "this game's colour"
 * means without each screen recomputing an alpha tint by hand.
 */
export function gameAccentTokens(accent: string) {
  return {
    accent,
    /** Tinted fill — art tiles, active nav rows. */
    soft: withAlpha(accent, 0.16),
    /** Soft wash of the accent, for a tonal control on sand or paper. */
    dim: withAlpha(accent, 0.22),
    /** Same hex as the border colour of an accented outline control. */
    border: accent,
    /** Broad ambient colour used behind key art, never behind body copy. */
    glow: withAlpha(accent, 0.28),
    /** Brown body ink. Pill labels use `pillChrome` instead: brown fails on purple. */
    ink: palette.brown,
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
 * Type scale.
 *
 * Display sizes get NEGATIVE tracking — large text set at default spacing looks
 * loose and amateurish, which is the single most common giveaway in app
 * typography. Small caps labels get positive tracking for the opposite reason.
 */
export const type = {
  hero: { fontFamily: font.bold, fontSize: 44, fontWeight: '700', letterSpacing: -1.2, lineHeight: 48 },
  /** Outlined celebration titles. Tracking is −1, a hair looser than `hero`. */
  displayXL: { fontFamily: font.bold, fontSize: 44, fontWeight: '700', letterSpacing: -1, lineHeight: 48 },
  display: { fontFamily: font.bold, fontSize: 36, fontWeight: '700', letterSpacing: -0.9, lineHeight: 41 },
  title: { fontFamily: font.semibold, fontSize: 23, fontWeight: '600', letterSpacing: -0.45, lineHeight: 28 },
  subtitle: { fontFamily: font.semibold, fontSize: 18, fontWeight: '600', letterSpacing: -0.2, lineHeight: 23 },
  body: { fontFamily: font.medium, fontSize: 15, fontWeight: '500', letterSpacing: -0.1, lineHeight: 22 },
  bodyStrong: { fontFamily: font.bold, fontSize: 15, fontWeight: '700', letterSpacing: -0.1, lineHeight: 22 },
  caption: { fontFamily: font.medium, fontSize: 13, fontWeight: '500', letterSpacing: 0, lineHeight: 18 },
  /** Small-caps section labels. Floor is 11px so they clear AA on sand and paper. */
  overline: { fontFamily: font.semibold, fontSize: labelFloorPx, fontWeight: '600', letterSpacing: 1.45, lineHeight: 15 },
} as const;

/**
 * Soft, layered shadows. A single hard shadow reads as a drop-shadow filter;
 * real depth needs a tight contact shadow plus a wide ambient one.
 */
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 7,
  },
  raised: {
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 15 },
    elevation: 13,
  },
  glow: {
    shadowColor: theme.accent,
    shadowOpacity: 0.3,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
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
  rayPeriodMs: 20000,
  shakeMs: 320,
  coinFlyMs: 650,
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
