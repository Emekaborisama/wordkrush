/**
 * The shared shape behind every game's level trail and meadow map (the
 * Animal Heroes level path): a row of stones, each cleared, current, open,
 * locked or not yet released. Pure; each game maps its own progress into it.
 */

export type StoneState = 'cleared' | 'current' | 'open' | 'locked' | 'soon';

export type Stone = {
  number: number;
  state: StoneState;
  /** Stars earned, when the game keeps them; a cleared stone without stars shows a tick. */
  stars?: 0 | 1 | 2 | 3;
  /** Short name for the map's label and screen readers. */
  name?: string;
};

/** Up to `size` stones around the current one, the current one centred where the ends allow. */
export function trailWindow(stones: readonly Stone[], current: number, size = 5): Stone[] {
  const index = Math.max(0, stones.findIndex((stone) => stone.number === current));
  const start = Math.min(Math.max(0, index - Math.floor(size / 2)), Math.max(0, stones.length - size));
  return stones.slice(start, start + size);
}

export type Point = { x: number; y: number };

/**
 * Where each stone sits on the meadow map: level 1 at the bottom, the path
 * climbing and swinging side to side, as on the reference map.
 */
export function meadowLayout(count: number, width: number, spacing = 112): { height: number; points: Point[] } {
  const height = Math.max(1, count) * spacing + spacing * 1.5;
  const swing = width * 0.3;
  const points = Array.from({ length: count }, (_, i) => ({
    x: Math.round(width / 2 + Math.sin(i * 0.95) * swing),
    y: Math.round(height - spacing * 0.9 - i * spacing),
  }));
  return { height, points };
}

/** A smooth SVG path through the points (Catmull-Rom as cubic Béziers), for the sandy trail. */
export function trailPathD(points: readonly Point[]): string {
  if (points.length === 0) return '';
  const [first] = points;
  let d = `M${first.x} ${first.y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x} ${p2.y}`;
  }
  return d;
}
