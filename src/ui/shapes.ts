/**
 * Pure geometry for the Block Blast chrome. Components draw; this file only
 * decides points, paths, and bitmaps so the rules can be tested without
 * rendering anything.
 */

export type Point = readonly [number, number];

function round2(n: number): number {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}

/**
 * Offsets for an outline drawn from copies of a glyph run. Eight copies read
 * as a clean ring up to 2px; past that the gaps between them show, so the
 * ring doubles to sixteen.
 */
export function strokeOffsets(width: number): ReadonlyArray<Point> {
  if (!(width > 0)) return [];
  const steps = width <= 2 ? 8 : 16;
  const out: Point[] = [];
  for (let i = 0; i < steps; i += 1) {
    const a = (i / steps) * Math.PI * 2;
    out.push([round2(Math.cos(a) * width), round2(Math.sin(a) * width)]);
  }
  return out;
}

/**
 * The extruded foot under an outlined label: the kit's button and ribbon
 * labels are thicker at the bottom than the sides. Three copies, one stroke
 * width apart, pushed down by `depth`.
 */
export function extrusionOffsets(width: number, depth: number): ReadonlyArray<Point> {
  if (!(depth > 0)) return [];
  const w = Math.max(0, width);
  const y = round2(w + depth);
  return [
    [round2(-w * 0.7), y],
    [0, y],
    [round2(w * 0.7), y],
  ];
}

function fmt(p: Point): string {
  return `${round2(p[0])},${round2(p[1])}`;
}

/**
 * Closed SVG path through `points` with every corner rounded by a quadratic
 * curve. The radius is clamped to half of each adjacent edge so short edges
 * never fold over.
 */
export function roundedPolygonPath(points: ReadonlyArray<Point>, radius: number): string {
  const n = points.length;
  if (n < 3) return '';
  const r = Math.max(0, radius);
  const parts: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const prev = points[(i - 1 + n) % n]!;
    const curr = points[i]!;
    const next = points[(i + 1) % n]!;
    const toPrev = [prev[0] - curr[0], prev[1] - curr[1]] as const;
    const toNext = [next[0] - curr[0], next[1] - curr[1]] as const;
    const lenPrev = Math.hypot(toPrev[0], toPrev[1]) || 1;
    const lenNext = Math.hypot(toNext[0], toNext[1]) || 1;
    const rp = Math.min(r, lenPrev / 2);
    const rn = Math.min(r, lenNext / 2);
    const a: Point = [curr[0] + (toPrev[0] / lenPrev) * rp, curr[1] + (toPrev[1] / lenPrev) * rp];
    const b: Point = [curr[0] + (toNext[0] / lenNext) * rn, curr[1] + (toNext[1] / lenNext) * rn];
    parts.push(`${i === 0 ? 'M' : 'L'}${fmt(a)}`);
    parts.push(`Q${fmt(curr)} ${fmt(b)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

/**
 * The kit's ribbon title tab ("Settings", "LEVEL 2"): wider along the top
 * edge, sides slanting in by `slant` to the foot.
 */
export function tabPath(width: number, height: number, slant: number, radius: number): string {
  const s = Math.max(0, Math.min(slant, width / 4));
  return roundedPolygonPath(
    [
      [0, 0],
      [width, 0],
      [width - s, height],
      [s, height],
    ],
    radius,
  );
}

/** Points of a five-pointed star centred on (cx, cy), first point straight up. */
export function starPoints(cx: number, cy: number, outer: number, inner: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/** A chubby kit star: rounded tips and rounded inner corners. */
export function starPath(cx: number, cy: number, outer: number, inner = outer * 0.52): string {
  return roundedPolygonPath(starPoints(cx, cy, outer, inner), outer * 0.13);
}

/**
 * Banner band for a red title ribbon ("More Lives?"): the top and bottom
 * edges both bow upward by `arch`, so the band reads as cloth, not a bar.
 */
export function bannerPath(width: number, height: number, arch: number): string {
  const w = round2(width);
  const h = round2(height);
  const a = round2(arch);
  return [
    `M0,${a}`,
    `Q${round2(w / 2)},${round2(-a)} ${w},${a}`,
    `L${w},${round2(h + a)}`,
    `Q${round2(w / 2)},${round2(h - a)} 0,${round2(h + a)}`,
    'Z',
  ].join(' ');
}

/** Wedge from (cx, cy) out to `radius`, centred on `angleDeg`, `spreadDeg` wide. */
export function rayWedgePath(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
  spreadDeg: number,
): string {
  const half = (spreadDeg * Math.PI) / 360;
  const a = (angleDeg * Math.PI) / 180;
  const p1: Point = [cx + Math.cos(a - half) * radius, cy + Math.sin(a - half) * radius];
  const p2: Point = [cx + Math.cos(a + half) * radius, cy + Math.sin(a + half) * radius];
  return `M${fmt([cx, cy])} L${fmt(p1)} L${fmt(p2)} Z`;
}

export type Circle = { cx: number; cy: number; r: number };

/**
 * A bank of cumulus along the bottom of a backdrop: overlapping circles whose
 * tops make the scalloped skyline in the kit. Deterministic for a width, so a
 * re-render never shuffles the sky.
 */
export function cloudBank(width: number, baseY: number, scale = 1): Circle[] {
  const unit = 46 * scale;
  const count = Math.max(3, Math.ceil(width / unit) + 1);
  const circles: Circle[] = [];
  for (let i = 0; i < count; i += 1) {
    // Two interleaved rows: big puffs, and smaller ones sitting in the gaps.
    const wobble = ((i * 37) % 11) / 11;
    const r = unit * (0.85 + wobble * 0.55);
    circles.push({ cx: round2(i * unit - unit * 0.3), cy: round2(baseY - r * 0.35), r: round2(r) });
    if (i < count - 1) {
      const rs = unit * (0.55 + (((i * 53) % 7) / 7) * 0.3);
      circles.push({ cx: round2(i * unit + unit * 0.2), cy: round2(baseY - r * 0.95), r: round2(rs) });
    }
  }
  return circles;
}

/**
 * 3×5 bitmap digits for the kit's level numbers, which are drawn out of
 * little cubes rather than set in type.
 */
export const DIGIT_PIXELS: Readonly<Record<string, readonly string[]>> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '011', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
};

export type PixelGrid = { cols: number; rows: number; cells: Array<readonly [number, number]> };

/**
 * Lit cells for a run of digits, one blank column between glyphs. Non-digits
 * are skipped rather than drawn as garbage.
 */
export function digitCells(text: string): PixelGrid {
  const glyphs = [...text].filter((c) => DIGIT_PIXELS[c] !== undefined);
  const cells: Array<readonly [number, number]> = [];
  glyphs.forEach((glyph, g) => {
    const rows = DIGIT_PIXELS[glyph]!;
    rows.forEach((row, y) => {
      [...row].forEach((bit, x) => {
        if (bit === '1') cells.push([g * 4 + x, y]);
      });
    });
  });
  return { cols: glyphs.length === 0 ? 0 : glyphs.length * 4 - 1, rows: 5, cells };
}
