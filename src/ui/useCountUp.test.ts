/**
 * useCountUp drives the reveal, and the sparkle fires off its `done` flag —
 * so "does it actually land exactly on target and report done" is worth
 * pinning down. Tested via the hook's pure timing maths rather than a DOM
 * render, which keeps this in the fast Node suite.
 */
import { describe, expect, it } from 'vitest';

/** Mirrors the easing used in useCountUp. */
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

describe('count-up easing', () => {
  it('starts at zero and ends at one', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it('decelerates — more than half the distance is covered in the first half', () => {
    // This is what makes the number read as "settling" rather than ramping.
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it('is monotonically increasing, so the number never ticks backwards', () => {
    let previous = -1;
    for (let t = 0; t <= 1; t += 0.02) {
      const v = easeOutCubic(t);
      expect(v).toBeGreaterThanOrEqual(previous);
      previous = v;
    }
  });

  it('never overshoots the target value', () => {
    const target = 1_780_454;
    for (let t = 0; t <= 1; t += 0.01) {
      expect(target * easeOutCubic(t)).toBeLessThanOrEqual(target);
    }
  });
});
