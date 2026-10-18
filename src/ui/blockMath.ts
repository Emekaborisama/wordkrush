/**
 * Pure maths for the block primitives (BlockTile, BlockLogo, BlockDigits,
 * SkyBackground, ScoreBurst). Components draw; this file decides colours,
 * sizes and geometry so the rules can be tested without rendering anything.
 */
import { rayWedgePath, type Circle, type Point } from './shapes';
import { cube, tint, type CubeColor } from './theme';

function round2(n: number): number {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

export function isCubeColor(value: string): value is CubeColor {
  return Object.prototype.hasOwnProperty.call(cube, value);
}

/** A cube key resolves to its kit hex; anything else is taken as a hex. */
export function cubeHex(color: CubeColor | string): string {
  return isCubeColor(color) ? cube[color] : color;
}

function parseHex(hex: string): [number, number, number] {
  const raw = hex.trim().replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`expected a hex colour, received ${hex}`);
  }
  const n = parseInt(full, 16);
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

/** Straight RGB mix: `t` 0 returns `a`, 1 returns `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const k = clamp01(t);
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  return toHex(r1 + (r2 - r1) * k, g1 + (g2 - g1) * k, b1 + (b2 - b1) * k);
}

export type Hsl = { h: number; s: number; l: number };

/** Hue in degrees [0, 360); saturation and lightness 0–1. */
export function hexToHsl(hex: string): Hsl {
  const [r8, g8, b8] = parseHex(hex);
  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const hue = (((h % 360) + 360) % 360) / 360;
  const sat = clamp01(s);
  const light = clamp01(l);
  if (sat === 0) return toHex(light * 255, light * 255, light * 255);
  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;
  const channel = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return toHex(channel(hue + 1 / 3) * 255, channel(hue) * 255, channel(hue - 1 / 3) * 255);
}

/**
 * Darker and richer, the way the kit paints a cube's lip and rim. Shading
 * toward black turns yellow olive and cream grey; mixing toward a deep,
 * saturated version of the same hue keeps the colour juicy. Yellows and
 * oranges also lean warmer as they darken, like the kit's gold.
 */
export function deepen(hex: string, amount: number): string {
  const { h, s } = hexToHsl(hex);
  const warm = h >= 20 && h <= 75;
  const target = hslToHex({ h: warm ? h - 14 : h, s: Math.min(1, s * 1.15 + 0.05), l: 0.3 });
  return mixHex(hex, target, amount);
}

/** Washed toward a cool grey — a locked or used-up cube. */
export function desaturate(hex: string, amount: number): string {
  const { h, s, l } = hexToHsl(hex);
  const k = clamp01(amount);
  return hslToHex({ h, s: s * (1 - k), l: l + (0.78 - l) * k * 0.6 });
}

/** Perceived brightness 0–1 (Rec. 601 luma), enough to pick an ink. */
export function luma(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export type CubeShades = {
  face: string;
  /** The darker band under the face. */
  lip: string;
  /** 1px edge around the whole cube. */
  rim: string;
  /** The stud's lower side, seen as a crescent under its cap. */
  studSide: string;
  /** The stud's top. */
  studCap: string;
  /** Lighter top-left of the cap, where the light hits it. */
  studLight: string;
  /** Soft shadow the stud casts down-right. */
  studShadow: string;
  /** Outline for white lettering on this cube. */
  ink: string;
};

export function cubeShades(hex: string): CubeShades {
  const [r, g, b] = parseHex(hex);
  const face = toHex(r, g, b);
  return {
    face,
    lip: deepen(face, 0.26),
    rim: deepen(face, 0.42),
    studSide: deepen(face, 0.14),
    studCap: tint(face, 0.03),
    studLight: tint(face, 0.16),
    studShadow: deepen(face, 0.4),
    ink: deepen(face, 0.72),
  };
}

/** Cream, gold and other light cubes take navy ink; saturated ones take white. */
export function prefersDarkInk(hex: string): boolean {
  return luma(hex) > 0.82;
}

// ---------------------------------------------------------------------------
// Exo 2 Black metrics (from the shipped TTF: unitsPerEm 1000, ascender 999,
// descender 201, cap height 690).
// ---------------------------------------------------------------------------

export const EXO_BLACK = { ascent: 0.999, descent: 0.201, cap: 0.69 } as const;

/** Advance widths in em for the glyphs headlines use. */
export const EXO_BLACK_ADVANCE: Readonly<Record<string, number>> = {
  A: 0.683, B: 0.66, C: 0.605, D: 0.701, E: 0.596, F: 0.574, G: 0.668, H: 0.714,
  I: 0.321, J: 0.404, K: 0.676, L: 0.557, M: 0.952, N: 0.738, O: 0.707, P: 0.646,
  Q: 0.707, R: 0.676, S: 0.61, T: 0.623, U: 0.705, V: 0.67, W: 1.003, X: 0.677,
  Y: 0.654, Z: 0.605,
  '0': 0.658, '1': 0.466, '2': 0.6, '3': 0.578, '4': 0.659, '5': 0.568, '6': 0.608,
  '7': 0.543, '8': 0.639, '9': 0.608,
  ' ': 0.21, '!': 0.329, '?': 0.536, '+': 0.523, '-': 0.379, '.': 0.259, ',': 0.255,
  ':': 0.277, x: 0.606, '×': 0.506,
};

const FALLBACK_ADVANCE = 0.66;

/** Width of `text` set in Exo 2 Black, in em. Unknown glyphs count as a wide letter. */
export function exoBlackWidthEm(text: string): number {
  let total = 0;
  for (const ch of text) {
    total += EXO_BLACK_ADVANCE[ch] ?? EXO_BLACK_ADVANCE[ch.toUpperCase()] ?? FALLBACK_ADVANCE;
  }
  return round2(total);
}

/**
 * Largest whole font size at which `text` (plus `extraPx` of outline and
 * extrusion) fits `maxWidth`, capped at `maxSize` and floored at `minSize`.
 */
export function fitFontSize(text: string, maxWidth: number, maxSize: number, minSize = 12, extraPx = 0): number {
  const em = exoBlackWidthEm(text);
  if (em <= 0) return maxSize;
  const fit = Math.floor((maxWidth - extraPx) / em);
  return Math.max(minSize, Math.min(maxSize, fit));
}

/**
 * Line height that exactly holds Exo 2's ascender + descender, so there is no
 * half-leading to reason about.
 */
export function exoLineHeight(fontSize: number): number {
  return Math.ceil(fontSize * (EXO_BLACK.ascent + EXO_BLACK.descent));
}

/**
 * Vertical nudge (px, negative = up) that puts the CAP height, not the line
 * box, on the optical centre. Exo 2's caps sit about 5% of the size low.
 */
export function capLift(fontSize: number): number {
  const lineCentre = (EXO_BLACK.ascent + EXO_BLACK.descent) / 2;
  const capCentre = EXO_BLACK.ascent - EXO_BLACK.cap / 2;
  return round2((lineCentre - capCentre) * fontSize);
}

/** Top of the caps inside an `exoLineHeight` line box, in px. */
export function capTop(fontSize: number): number {
  const line = exoLineHeight(fontSize);
  const halfLeading = (line - fontSize * (EXO_BLACK.ascent + EXO_BLACK.descent)) / 2;
  return round2(halfLeading + (EXO_BLACK.ascent - EXO_BLACK.cap) * fontSize);
}

// ---------------------------------------------------------------------------
// BlockTile
// ---------------------------------------------------------------------------

export type TileMetrics = {
  /** Corner radius, ≈18% of the size. */
  radius: number;
  /** Darker band at the foot, ≈8%. */
  lip: number;
  /** Dark edge width. */
  rim: number;
  /** Stud diameter, ≈46%. 0 when the tile is too small to read one. */
  stud: number;
  /** How far the stud's darker side shows below its cap. */
  studDrop: number;
  /** Gloss dot diameter. 0 when the tile is too small. */
  dot: number;
  letterSize: number;
  /** Outline width for white letters on a coloured cube. */
  letterStroke: number;
  /** Extra outline under white letters: the kit's thick foot. */
  letterFoot: number;
};

/** Below this a stud is a smudge, so cubes draw flat. */
export const STUD_MIN_PX = 10;

export function tileMetrics(size: number, letterChars = 1): TileMetrics {
  const s = Math.max(0, size);
  const stud = s >= STUD_MIN_PX ? round2(s * 0.46) : 0;
  return {
    radius: round2(s * 0.18),
    lip: Math.max(1, Math.round(s * 0.08)),
    rim: s >= 6 ? 1 : 0,
    stud,
    studDrop: round2(Math.max(1, stud * 0.1)),
    dot: s >= 16 ? round2(Math.max(2, s * 0.075)) : 0,
    letterSize: round2(s * (letterChars > 1 ? 0.4 : 0.56)),
    letterStroke: round2(Math.max(1, Math.min(2, s * 0.028))),
    letterFoot: round2(Math.max(0.5, s * 0.02)),
  };
}

// ---------------------------------------------------------------------------
// BlockLogo
// ---------------------------------------------------------------------------

export type Pose = { rotate: number; drop: number };

/**
 * The hero's arch: outer cubes sit lower and lean outward, and alternate
 * cubes nudge a degree or so the other way so the row never looks stamped.
 * `drop` is px down from the row's top line.
 */
export function logoCubePoses(count: number, cubePx: number): Pose[] {
  const mid = (count - 1) / 2;
  return Array.from({ length: count }, (_, i) => {
    const k = mid === 0 ? 0 : (i - mid) / mid;
    const alternate = i % 2 === 0 ? -1.5 : 1.5;
    return { rotate: round2(k * 7 + alternate), drop: round2(k * k * cubePx * 0.12) };
  });
}

/** Bouncy, uneven letters, like the kit's "BLAST!": small tilts and lifts. */
export function letterPoses(count: number, sizePx: number): Pose[] {
  const tilts = [-4, 2, -2, 3, -3, 7, -2, 3];
  const drops = [0.02, -0.03, 0.01, -0.02, 0.02, -0.04, 0.01, -0.01];
  return Array.from({ length: count }, (_, i) => ({
    rotate: tilts[i % tilts.length]!,
    drop: round2(drops[i % drops.length]! * sizePx),
  }));
}

export type LogoMetrics = {
  cube: number;
  /** Horizontal overlap between neighbouring cubes (negative margin). */
  overlap: number;
  /** Font size of the letter raised on each cube. */
  cubeLetter: number;
  /** "KRUSH!" font size. */
  wordSize: number;
  /**
   * Vertical stretch on "KRUSH!". Exo 2 is wide; the kit's "BLAST!" is tall
   * and condensed, so the word is drawn at a width that fits and scaled up.
   */
  stretch: number;
  wordStroke: number;
  wordDepth: number;
  /** How far "KRUSH!" tucks up under the cubes. */
  tuck: number;
};

export function logoMetrics(cubePx: number, layout: 'stacked' | 'row'): LogoMetrics {
  const c = Math.max(8, cubePx);
  const row = layout === 'row';
  const wordSize = Math.round(row ? c * 1.02 : c * 1.12);
  return {
    cube: c,
    overlap: round2(c * 0.04),
    cubeLetter: Math.round(c * 0.7),
    wordSize,
    stretch: row ? 1.15 : 1.3,
    wordStroke: Math.max(1.5, Math.round(wordSize * 0.05 * 2) / 2),
    wordDepth: Math.max(1, Math.round(wordSize * 0.13)),
    tuck: round2(row ? 0 : c * 0.3),
  };
}

// ---------------------------------------------------------------------------
// BlockDigits
// ---------------------------------------------------------------------------

export function digitGapFor(cell: number): number {
  return Math.max(1, Math.round(cell * 0.12));
}

export function pixelBoxSize(cols: number, rows: number, cell: number, gap: number) {
  return {
    width: cols <= 0 ? 0 : round2(cols * cell + (cols - 1) * gap),
    height: rows <= 0 ? 0 : round2(rows * cell + (rows - 1) * gap),
  };
}

// ---------------------------------------------------------------------------
// SkyBackground
// ---------------------------------------------------------------------------

/**
 * Sun-ray wedges for a rotating layer: a square `2 * radius` wide with the
 * sun at its centre. Evenly spaced so a slow spin never shows a seam.
 */
export function sunRayWedges(radius: number, count: number, spreadDeg: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    rayWedgePath(radius, radius, radius, (i * 360) / count - 90, spreadDeg),
  );
}

/**
 * The faint harlequin behind the kit's play field: every other diamond of a
 * lattice whose diamonds are `cell` px across, covering `width × height` with
 * a diamond of bleed on every side. One path, so it is one draw call.
 */
export function diamondLatticePath(width: number, height: number, cell: number): string {
  if (!(cell > 0) || !(width > 0) || !(height > 0)) return '';
  const a = cell / 2;
  const parts: string[] = [];
  for (let y = 0; y <= height + cell; y += cell) {
    for (let x = 0; x <= width + cell; x += cell) {
      parts.push(
        `M${round2(x)},${round2(y - a)} L${round2(x + a)},${round2(y)} L${round2(x)},${round2(y + a)} L${round2(x - a)},${round2(y)} Z`,
      );
    }
  }
  return parts.join(' ');
}

/** Small deterministic PRNG so a backdrop never reshuffles on re-render. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Spark = { x: number; y: number; r: number; alpha: number };

/** Faint sparkles scattered over the upper part of a backdrop. */
export function sparkleField(width: number, height: number, count: number, seed = 11): Spark[] {
  const rand = seededRandom(seed);
  return Array.from({ length: Math.max(0, count) }, () => ({
    x: round2(width * (0.06 + rand() * 0.88)),
    y: round2(height * (0.08 + rand() * 0.5)),
    r: round2(3 + rand() * 4),
    alpha: round2(0.35 + rand() * 0.4),
  }));
}

/** A four-point twinkle. `waist` 0–1 sets how fat the arms are. */
export function sparklePath(cx: number, cy: number, r: number, waist = 0.18): string {
  const w = r * waist;
  const p = (x: number, y: number) => `${round2(x)},${round2(y)}`;
  return [
    `M${p(cx, cy - r)}`,
    `Q${p(cx + w, cy - w)} ${p(cx + r, cy)}`,
    `Q${p(cx + w, cy + w)} ${p(cx, cy + r)}`,
    `Q${p(cx - w, cy + w)} ${p(cx - r, cy)}`,
    `Q${p(cx - w, cy - w)} ${p(cx, cy - r)}`,
    'Z',
  ].join(' ');
}

/**
 * Pale cloud puffs for the play backdrop: two loose clusters, upper left and
 * lower right, the way the kit leaves soft shapes around the HUD and tray.
 */
export function playCloudPuffs(width: number, height: number): Circle[] {
  const u = Math.max(24, Math.min(width, 520) * 0.12);
  const cluster = (cx: number, cy: number, scale: number): Circle[] => [
    { cx: round2(cx - u * 1.1 * scale), cy: round2(cy + u * 0.25 * scale), r: round2(u * 0.75 * scale) },
    { cx: round2(cx), cy: round2(cy), r: round2(u * scale) },
    { cx: round2(cx + u * 1.05 * scale), cy: round2(cy + u * 0.2 * scale), r: round2(u * 0.8 * scale) },
    { cx: round2(cx + u * 2 * scale), cy: round2(cy + u * 0.45 * scale), r: round2(u * 0.55 * scale) },
  ];
  return [
    ...cluster(width * 0.12, height * 0.2, 1),
    ...cluster(width * 0.78, height * 0.62, 1.15),
    ...cluster(width * 0.05, height * 0.9, 1.3),
  ];
}

// ---------------------------------------------------------------------------
// Bursts and banners
// ---------------------------------------------------------------------------

export type StarSpot = { x: number; y: number; size: number; delay: number; rotate: number };

/**
 * Little stars around a celebratory word: spread round an ellipse
 * `rx × ry` centred on the origin, alternating big and small, with staggered
 * delays (ms) so they pop one after another.
 */
export function bannerStars(rx: number, ry: number, count: number, staggerMs = 45): StarSpot[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => {
    const a = -Math.PI * 0.9 + (i / Math.max(1, count)) * Math.PI * 2 + (i % 2 === 0 ? 0.12 : -0.08);
    const reach = i % 2 === 0 ? 1 : 0.82;
    return {
      x: round2(Math.cos(a) * rx * reach),
      y: round2(Math.sin(a) * ry * reach),
      size: i % 3 === 0 ? 1 : i % 3 === 1 ? 0.7 : 0.55,
      delay: i * staggerMs,
      rotate: round2(((i * 47) % 40) - 20),
    };
  });
}

/** Light streaks bursting from behind a banner: alternating long and short. */
export function streakWedges(radius: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const long = i % 2 === 0;
    return rayWedgePath(radius, radius, radius * (long ? 1 : 0.68), (i * 360) / count, long ? 7 : 4);
  });
}

/**
 * Offsets for a stacked extrusion: `steps` copies stepping down-right to
 * (`dx`, `dy`), deepest first, so painting in order leaves the shallowest
 * copy on top.
 */
export function extrusionSteps(dx: number, dy: number, steps: number): Point[] {
  const n = Math.max(0, Math.round(steps));
  const out: Point[] = [];
  for (let i = n; i >= 1; i -= 1) {
    out.push([round2((dx * i) / n), round2((dy * i) / n)]);
  }
  return out;
}
