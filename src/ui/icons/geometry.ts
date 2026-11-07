/**
 * Pure path geometry for `GameIcon`. Icons draw in a 64×64 box; this file only
 * builds `d` strings and points, so every shape is testable without a renderer.
 *
 * Angles are degrees clockwise from twelve o'clock, the way a dial reads,
 * because most icon parts (gear teeth, clock hands, sound waves, a tilted
 * beam) are described that way. Screen y grows downward.
 */
import { roundedPolygonPath, type Point } from '../shapes';

function r2(n: number): number {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}

function at(p: Point): string {
  return `${r2(p[0])},${r2(p[1])}`;
}

/** Point `r` from (cx, cy) at `deg` clockwise from twelve o'clock. */
export function polar(cx: number, cy: number, r: number, deg: number): Point {
  const a = (deg * Math.PI) / 180;
  return [r2(cx + Math.sin(a) * r), r2(cy - Math.cos(a) * r)];
}

/** `p` turned `deg` clockwise about (cx, cy). */
export function rotatePoint(p: Point, cx: number, cy: number, deg: number): Point {
  const a = (deg * Math.PI) / 180;
  const dx = p[0] - cx;
  const dy = p[1] - cy;
  return [r2(cx + dx * Math.cos(a) - dy * Math.sin(a)), r2(cy + dx * Math.sin(a) + dy * Math.cos(a))];
}

/**
 * Ellipse as two arcs, optionally turned `rot` degrees. A path rather than an
 * `<Ellipse>` so it can join other subpaths in one `d` (holes, outlines) and
 * be clipped against.
 */
export function ellipsePath(cx: number, cy: number, rx: number, ry: number, rot = 0): string {
  const start = rotatePoint([cx - rx, cy], cx, cy, rot);
  const mid = rotatePoint([cx + rx, cy], cx, cy, rot);
  const arc = `A${r2(rx)},${r2(ry)} ${r2(rot)} 1 0`;
  return `M${at(start)} ${arc} ${at(mid)} ${arc} ${at(start)} Z`;
}

export function circlePath(cx: number, cy: number, r: number): string {
  return ellipsePath(cx, cy, r, r);
}

/** Rounded rectangle. The radius is clamped to half the shorter side. */
export function roundRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const k = r2(Math.max(0, Math.min(r, w / 2, h / 2)));
  const arc = `A${k},${k} 0 0 1`;
  return [
    `M${at([x + k, y])}`,
    `H${r2(x + w - k)}`,
    `${arc} ${at([x + w, y + k])}`,
    `V${r2(y + h - k)}`,
    `${arc} ${at([x + w - k, y + h])}`,
    `H${r2(x + k)}`,
    `${arc} ${at([x, y + h - k])}`,
    `V${r2(y + k)}`,
    `${arc} ${at([x + k, y])}`,
    'Z',
  ].join(' ');
}

/** Corners of a `w`×`h` rectangle centred on (cx, cy), turned `deg` clockwise. */
export function rectPoints(cx: number, cy: number, w: number, h: number, deg = 0): Point[] {
  const hw = w / 2;
  const hh = h / 2;
  const corners: Point[] = [
    [cx - hw, cy - hh],
    [cx + hw, cy - hh],
    [cx + hw, cy + hh],
    [cx - hw, cy + hh],
  ];
  return corners.map((p) => rotatePoint(p, cx, cy, deg));
}

/**
 * Open arc centreline from `from` to `to`. A positive span runs clockwise.
 * Spans are capped just short of a full turn, which one arc cannot draw.
 */
export function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const span = Math.max(-359.9, Math.min(359.9, to - from));
  const large = Math.abs(span) > 180 ? 1 : 0;
  const sweep = span >= 0 ? 1 : 0;
  const end = polar(cx, cy, r, from + span);
  return `M${at(polar(cx, cy, r, from))} A${r2(r)},${r2(r)} 0 ${large} ${sweep} ${at(end)}`;
}

/**
 * Triangle for an arrowhead: `tip` first, then the two base corners `len`
 * behind it along `dir` and `half` to either side.
 */
export function arrowHead(tip: Point, dir: Point, len: number, half: number): Point[] {
  const mag = Math.hypot(dir[0], dir[1]) || 1;
  const ux = dir[0] / mag;
  const uy = dir[1] / mag;
  const bx = tip[0] - ux * len;
  const by = tip[1] - uy * len;
  return [
    [r2(tip[0]), r2(tip[1])],
    [r2(bx - uy * half), r2(by + ux * half)],
    [r2(bx + uy * half), r2(by - ux * half)],
  ];
}

/**
 * A circular arrow (retry): the arc from `from` to `to` clockwise, and a head
 * whose base sits on the arc's end, pointing on round the circle.
 */
export function arcArrow(
  cx: number,
  cy: number,
  r: number,
  from: number,
  to: number,
  len: number,
  half: number,
): { arc: string; head: Point[] } {
  const end = polar(cx, cy, r, to);
  const a = (to * Math.PI) / 180;
  // Clockwise tangent of a dial angle.
  const dir: Point = [Math.cos(a), Math.sin(a)];
  const tip: Point = [end[0] + dir[0] * len, end[1] + dir[1] * len];
  return { arc: arcPath(cx, cy, r, from, to), head: arrowHead(tip, dir, len, half) };
}

export type GearSpec = {
  teeth: number;
  /** Radius at the tooth tips. */
  tip: number;
  /** Radius between teeth. */
  root: number;
  /** Centre hole radius, 0 for none. Needs `fillRule="evenodd"`. */
  hole?: number;
  /** Corner rounding. */
  round?: number;
  /** Share of each pitch the tooth takes. */
  toothFrac?: number;
};

/**
 * Gear rim: flat-topped teeth that taper a little toward the tip, like the
 * kit's chunky gear, four corners per tooth.
 */
export function gearPoints(cx: number, cy: number, spec: GearSpec): Point[] {
  const teeth = Math.max(3, Math.round(spec.teeth));
  const pitch = 360 / teeth;
  const half = (pitch * (spec.toothFrac ?? 0.5)) / 2;
  const out: Point[] = [];
  for (let i = 0; i < teeth; i += 1) {
    const c = i * pitch;
    out.push(
      polar(cx, cy, spec.root, c - half * 1.12),
      polar(cx, cy, spec.tip, c - half * 0.78),
      polar(cx, cy, spec.tip, c + half * 0.78),
      polar(cx, cy, spec.root, c + half * 1.12),
    );
  }
  return out;
}

export function gearPath(cx: number, cy: number, spec: GearSpec): string {
  const rim = roundedPolygonPath(gearPoints(cx, cy, spec), spec.round ?? 2);
  const hole = spec.hole ?? 0;
  return hole > 0 ? `${rim} ${circlePath(cx, cy, hole)}` : rim;
}

/**
 * A chubby heart `w` wide and `h` tall, lobes touching `top`, centred on `cx`.
 * Starts and ends at the bottom point.
 */
export function heartPath(cx: number, top: number, w: number, h: number): string {
  const X = (u: number) => r2(cx + (u - 0.5) * w);
  const Y = (v: number) => r2(top + v * h);
  return [
    `M${X(0.5)},${Y(1)}`,
    `C${X(0.38)},${Y(0.91)} ${X(0)},${Y(0.68)} ${X(0)},${Y(0.33)}`,
    `C${X(0)},${Y(0.1)} ${X(0.15)},${Y(0)} ${X(0.28)},${Y(0)}`,
    `C${X(0.4)},${Y(0)} ${X(0.47)},${Y(0.07)} ${X(0.5)},${Y(0.18)}`,
    `C${X(0.53)},${Y(0.07)} ${X(0.6)},${Y(0)} ${X(0.72)},${Y(0)}`,
    `C${X(0.85)},${Y(0)} ${X(1)},${Y(0.1)} ${X(1)},${Y(0.33)}`,
    `C${X(1)},${Y(0.68)} ${X(0.62)},${Y(0.91)} ${X(0.5)},${Y(1)}`,
    'Z',
  ].join(' ');
}

/**
 * Four-point sparkle: tips `r` from the centre, each side pinched in toward
 * it by a quadratic (`pinch` 0 is a sharp star, larger is fatter).
 */
export function sparklePath(cx: number, cy: number, r: number, pinch = 0.18): string {
  const k = r * pinch;
  return [
    `M${at([cx, cy - r])}`,
    `Q${at([cx + k, cy - k])} ${at([cx + r, cy])}`,
    `Q${at([cx + k, cy + k])} ${at([cx, cy + r])}`,
    `Q${at([cx - k, cy + k])} ${at([cx - r, cy])}`,
    `Q${at([cx - k, cy - k])} ${at([cx, cy - r])}`,
    'Z',
  ].join(' ');
}

/** Spiky burst (a fuse spark): `points` tips alternating with inner corners. */
export function burstPoints(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points: number,
  rot = 0,
): Point[] {
  const n = Math.max(3, Math.round(points));
  const out: Point[] = [];
  for (let i = 0; i < n * 2; i += 1) {
    out.push(polar(cx, cy, i % 2 === 0 ? outer : inner, rot + (i * 180) / n));
  }
  return out;
}
