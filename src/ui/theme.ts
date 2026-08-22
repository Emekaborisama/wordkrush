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
  // Elevation ramp: further back -> darker.
  bg: '#080A0F',
  bgElevated: '#10141C',
  card: '#171D28',
  cardHigh: '#1F2735',
  /** Hairline highlight for the top edge of a raised surface. */
  edge: 'rgba(255,255,255,0.07)',
  border: '#242D3C',
  borderStrong: '#313D50',

  text: '#F7F9FC',
  textMuted: '#A3B0C2',
  textDim: '#6B7A90',

  accent: '#3DDC84',
  accentSoft: 'rgba(61,220,132,0.14)',
  accentDim: '#12341F',
  danger: '#FF6B6B',
  dangerSoft: 'rgba(255,107,107,0.13)',
  dangerDim: '#3A1416',
  violet: '#A78BFA',
  violetSoft: 'rgba(167,139,250,0.14)',
} as const;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 18, xl: 26, xxl: 38 } as const;

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
  display: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8, lineHeight: 38 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4, lineHeight: 27 },
  body: { fontSize: 15, fontWeight: '500', letterSpacing: -0.1, lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: '700', letterSpacing: -0.1, lineHeight: 22 },
  caption: { fontSize: 12.5, fontWeight: '500', letterSpacing: 0, lineHeight: 17 },
  /** Small-caps section labels. */
  overline: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, lineHeight: 13 },
} as const;

/**
 * Soft, layered shadows. A single hard shadow reads as a drop-shadow filter;
 * real depth needs a tight contact shadow plus a wide ambient one.
 */
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  raised: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
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
  gentle: { damping: 18, stiffness: 140, mass: 0.9 },
  snappy: { damping: 22, stiffness: 260, mass: 0.7 },
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
