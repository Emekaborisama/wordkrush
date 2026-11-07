/**
 * Where the cat is on the level ride's sandy path. Pure, so the walk is
 * tested without rendering: the path is one cubic Bézier, and `Animated`
 * interpolates between these samples so the cat follows the curve.
 */
import type { Point } from './levelTrail';

export function bezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

/** `count + 1` evenly spaced samples from t = 0 to 1, each with its point. */
export function rideSamples(p0: Point, p1: Point, p2: Point, p3: Point, count: number): Array<Point & { t: number }> {
  const steps = Math.max(1, Math.floor(count));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return { t, ...bezierPoint(p0, p1, p2, p3, t) };
  });
}
