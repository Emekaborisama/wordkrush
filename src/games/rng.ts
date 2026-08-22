/**
 * Seeded, pure RNG.
 *
 * The generator never mutates hidden state: every call takes a seed and
 * returns the next seed alongside the value. That keeps the engine reducer a
 * genuine pure function, so a whole run can be replayed exactly in a test —
 * and it is what will let a daily-challenge mode hand every player the same
 * sequence from a date-derived seed.
 *
 * mulberry32: small, fast, good enough distribution for picking cards.
 */

/** Returns [value in [0,1), next seed]. */
export function nextRandom(seed: number): [number, number] {
  let s = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, s];
}

/** Returns [integer in [0, max), next seed]. */
export function nextInt(seed: number, max: number): [number, number] {
  const [value, next] = nextRandom(seed);
  return [Math.floor(value * max), next];
}

/** A seed for a normal (non-daily) run. */
export function randomSeed(): number {
  return (Math.random() * 2 ** 32) >>> 0;
}

/** Same calendar day -> same seed, for a future daily challenge. */
export function seedFromDate(date = new Date()): number {
  const key = Number(
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(
      date.getUTCDate(),
    ).padStart(2, '0')}`,
  );
  return (key * 2654435761) >>> 0;
}
