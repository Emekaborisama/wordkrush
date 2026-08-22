/**
 * Design tokens.
 *
 * Two principles the rest of the UI leans on:
 *
 * 1. ELEVATION IS A RAMP, not two colours. Surfaces get lighter as they come
 *    forward, and each carries a hairline top highlight, which is what stops a
 *    dark UI reading as flat black rectangles.
 *
 * 2. PROXIMITY IS CONTINUOUS. Guess feedback interpolates hue smoothly instead
 *    of snapping between four buckets, so a rank of 900 and 1000 look subtly
 *    different rather than identical.
 */

export const theme = {
  // Deep indigo rather than neutral black: playful colour can glow against it
  // without the app turning into a wall of disconnected neon outlines.
  bg: '#0A0817',
  bgElevated: '#121025',
  card: '#1A1732',
  cardHigh: '#241F43',
  /** Hairline highlight for the top edge of a raised surface. */
  edge: 'rgba(255,255,255,0.10)',
  border: '#332D55',
  borderStrong: '#4B4171',

  text: '#FFF9F6',
  textMuted: '#C5BED8',
  textDim: '#87809E',

  // WordCrush umbrella brand. Individual games use registry accents.
  accent: '#FF5D8F',
  accentSoft: 'rgba(255,93,143,0.16)',
  accentDim: '#3B152B',
  accentSecondary: '#8B6BFF',
  accentSecondarySoft: 'rgba(139,107,255,0.16)',
  success: '#32E487',
  successSoft: 'rgba(50,228,135,0.16)',
  successDim: '#103624',
  danger: '#FF5E72',
  dangerSoft: 'rgba(255,94,114,0.16)',
  dangerDim: '#3B1520',
  warning: '#FFB020',
  warningSoft: 'rgba(255,176,32,0.16)',
  violet: '#9B78FF',
  violetSoft: 'rgba(155,120,255,0.16)',
  overlay: 'rgba(5,3,14,0.78)',
} as const;

export const radius = { sm: 12, md: 18, lg: 28, xl: 36, pill: 999 } as const;

export const space = { xxs: 2, xs: 5, sm: 9, md: 14, lg: 20, xl: 28, xxl: 40, hero: 56 } as const;

/** Bundled, offline display faces. Body copy deliberately stays on the
 * platform system face for Apple-grade legibility at small sizes. */
export const font = {
  medium: 'Fredoka_500Medium',
  semibold: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
} as const;

/**
 * Interaction constants. One pressed-state and one touch-target minimum for
 * the whole app, so `PressableScale` is the only place that decides what a
 * tap looks like — screens stop inventing their own opacity value.
 */
export const interaction = {
  pressedOpacity: 0.9,
  pressedScale: 0.97,
  pressedTranslateY: 3,
  minTouch: 44,
} as const;

/**
 * Surface depth, back to front. Screens pick a level, not a raw token, so
 * "how far forward is this card" is a single decision made once here rather
 * than re-guessed per screen.
 */
const ELEVATION = [
  { backgroundColor: '#0A0817', borderColor: '#211C3A', borderTopColor: 'rgba(255,255,255,0.06)' }, // 0 — page
  { backgroundColor: '#121025', borderColor: '#2A2547', borderTopColor: 'rgba(255,255,255,0.08)' }, // 1 — bgElevated
  { backgroundColor: '#1A1732', borderColor: '#332D55', borderTopColor: 'rgba(255,255,255,0.10)' }, // 2 — card
  { backgroundColor: '#241F43', borderColor: '#4B4171', borderTopColor: 'rgba(255,255,255,0.13)' }, // 3 — cardHigh
] as const;

export function elevation(level: 0 | 1 | 2 | 3) {
  return ELEVATION[level];
}

/** Hex (`#rrggbb`) + 0–1 alpha -> `#rrggbbaa`. Keeps tint math in one place. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
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
    /** Near-black tint for a filled button on a dark background. */
    dim: withAlpha(accent, 0.22),
    /** Same hex as the border colour of an accented outline control. */
    border: accent,
    /** Broad ambient colour used behind key art, never behind body copy. */
    glow: withAlpha(accent, 0.28),
    /** Dark text on a bright CTA. */
    ink: '#100E20',
  } as const;
}

/**
 * Numbers in a vertical list must use tabular figures, or digits of different
 * widths make the column visibly ragged as ranks change.
 */
export const numeric = {
  fontVariant: ['tabular-nums'] as const,
};

export const frame = { maxWidth: 460, maxHeight: 900 } as const;

/**
 * Type scale.
 *
 * Display sizes get NEGATIVE tracking — large text set at default spacing looks
 * loose and amateurish, which is the single most common giveaway in app
 * typography. Small caps labels get positive tracking for the opposite reason.
 */
export const type = {
  hero: { fontFamily: font.bold, fontSize: 44, fontWeight: '700', letterSpacing: -1.2, lineHeight: 48 },
  display: { fontFamily: font.bold, fontSize: 36, fontWeight: '700', letterSpacing: -0.9, lineHeight: 41 },
  title: { fontFamily: font.semibold, fontSize: 23, fontWeight: '600', letterSpacing: -0.45, lineHeight: 28 },
  subtitle: { fontFamily: font.semibold, fontSize: 18, fontWeight: '600', letterSpacing: -0.2, lineHeight: 23 },
  body: { fontSize: 15, fontWeight: '500', letterSpacing: -0.1, lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: '700', letterSpacing: -0.1, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '500', letterSpacing: 0, lineHeight: 18 },
  /** Small-caps section labels. */
  overline: { fontFamily: font.semibold, fontSize: 10.5, fontWeight: '600', letterSpacing: 1.45, lineHeight: 14 },
} as const;

/**
 * Soft, layered shadows. A single hard shadow reads as a drop-shadow filter;
 * real depth needs a tight contact shadow plus a wide ambient one.
 */
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.42,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 7,
  },
  raised: {
    shadowColor: '#000',
    shadowOpacity: 0.52,
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
 * entering, `snappy` for direct responses to a tap.
 */
export const motion = {
  gentle: { damping: 18, stiffness: 145, mass: 0.9 },
  snappy: { damping: 17, stiffness: 290, mass: 0.66 },
  celebratory: { damping: 12, stiffness: 190, mass: 0.72 },
  fastMs: 150,
  standardMs: 240,
  /** Duration for value counting, which should feel deliberate, not instant. */
  countMs: 620,
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
