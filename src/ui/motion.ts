/**
 * Pure geometry for the game-feel layer. Components animate; this file only
 * decides offsets, counts, and labels so the rules can be tested without
 * rendering.
 */

/** Eight ±2px copies, plus four cardinals at ±3px so the outline reads thick. */
export const OUTLINE_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-2, -2],
  [0, -2],
  [2, -2],
  [-2, 0],
  [2, 0],
  [-2, 2],
  [0, 2],
  [2, 2],
  [-3, 0],
  [3, 0],
  [0, -3],
  [0, 3],
];

/** Tight outline for a star glyph. A 2px ring swallows the character. */
export const STAR_OUTLINE_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

export const EXTRUSION_OFFSET = { x: 0, y: 3 } as const;
export const EXTRUDE_SHADE = 0.45;

export const STAR_COUNT = 3;
export const CENTER_STAR_INDEX = 1;
export const CENTER_STAR_SCALE = 1.3;

export const RAY_COUNT = 12;
export const CONFETTI_CAP = 24;

export function starScale(index: number): number {
  return index === CENTER_STAR_INDEX ? CENTER_STAR_SCALE : 1;
}

export function starLabel(earned: number, total = STAR_COUNT): string {
  const n = Math.max(0, Math.min(total, Math.trunc(earned)));
  return `${n} of ${total} stars`;
}

export function staggerDelay(index: number, staggerMs: number): number {
  return Math.max(0, index) * staggerMs;
}

export function rayAngleDeg(index: number, count = RAY_COUNT): number {
  return (index * 360) / count;
}

export function clampParticleCount(count: number, cap = CONFETTI_CAP): number {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.min(cap, Math.floor(count)));
}
