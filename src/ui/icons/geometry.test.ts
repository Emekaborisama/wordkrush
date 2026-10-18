import { describe, expect, it } from 'vitest';
import {
  arcArrow,
  arcPath,
  arrowHead,
  burstPoints,
  circlePath,
  ellipsePath,
  gearPath,
  gearPoints,
  heartPath,
  polar,
  rectPoints,
  rotatePoint,
  roundRectPath,
  sparklePath,
} from './geometry';

function numbers(d: string): number[] {
  return (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

describe('polar', () => {
  it('reads like a dial: 0 is up, 90 is right, 180 is down', () => {
    expect(polar(0, 0, 10, 0)).toEqual([0, -10]);
    expect(polar(0, 0, 10, 90)).toEqual([10, 0]);
    expect(polar(0, 0, 10, 180)).toEqual([0, 10]);
    expect(polar(5, 5, 10, 270)).toEqual([-5, 5]);
  });
});

describe('rotatePoint', () => {
  it('turns clockwise on screen', () => {
    expect(rotatePoint([1, 0], 0, 0, 90)).toEqual([0, 1]);
    expect(rotatePoint([10, 5], 5, 5, 180)).toEqual([0, 5]);
  });
});

describe('ellipsePath / circlePath', () => {
  it('starts on the left edge and closes with two arcs', () => {
    const d = circlePath(32, 30, 10);
    expect(d.startsWith('M22,30')).toBe(true);
    expect(d.match(/A/g)).toHaveLength(2);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('turns the start point and the arc axis together', () => {
    const d = ellipsePath(0, 0, 10, 4, 90);
    expect(d.startsWith('M0,-10')).toBe(true);
    expect(d).toContain('A10,4 90 1 0');
  });
});

describe('roundRectPath', () => {
  it('clamps the radius to half the shorter side', () => {
    expect(roundRectPath(0, 0, 10, 4, 9)).toContain('A2,2');
  });

  it('stays inside its box', () => {
    const xs = numbers(roundRectPath(3, 4, 20, 10, 3));
    expect(Math.min(...xs.filter((n) => n !== 0 && n !== 1))).toBeGreaterThanOrEqual(3);
    expect(Math.max(...xs)).toBeLessThanOrEqual(23);
  });
});

describe('rectPoints', () => {
  it('keeps side lengths when turned', () => {
    const [a, b, c] = rectPoints(32, 32, 20, 8, 37);
    expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeCloseTo(20, 1);
    expect(Math.hypot(c[0] - b[0], c[1] - b[1])).toBeCloseTo(8, 1);
  });
});

describe('arcPath', () => {
  it('sets the large-arc flag past half a turn and sweeps clockwise for a positive span', () => {
    expect(arcPath(0, 0, 10, 0, 90)).toBe('M0,-10 A10,10 0 0 1 10,0');
    expect(arcPath(0, 0, 10, 0, 270)).toContain(' 0 1 1 ');
    expect(arcPath(0, 0, 10, 90, 0)).toContain(' 0 0 0 ');
  });

  it('never asks one arc for a full circle', () => {
    const d = arcPath(0, 0, 10, 0, 360);
    const [, , , , , , , ex] = numbers(d);
    expect(ex).not.toBe(0);
  });
});

describe('arrowHead', () => {
  it('puts the base `len` behind the tip and `half` to each side', () => {
    const [tip, left, right] = arrowHead([10, 0], [1, 0], 4, 3);
    expect(tip).toEqual([10, 0]);
    expect(left).toEqual([6, 3]);
    expect(right).toEqual([6, -3]);
  });
});

describe('arcArrow', () => {
  it('starts the head where the arc ends and points it on round clockwise', () => {
    const { arc, head } = arcArrow(0, 0, 10, 180, 360, 4, 3);
    expect(arc.startsWith('M0,10')).toBe(true);
    // At twelve o'clock the clockwise tangent points right.
    expect(head[0]).toEqual([4, -10]);
  });
});

describe('gearPoints / gearPath', () => {
  it('has four corners per tooth, on the tip and root circles', () => {
    const pts = gearPoints(0, 0, { teeth: 8, tip: 20, root: 15 });
    expect(pts).toHaveLength(32);
    pts.forEach(([x, y], i) => {
      const r = Math.hypot(x, y);
      expect(r).toBeCloseTo(i % 4 === 0 || i % 4 === 3 ? 15 : 20, 1);
    });
  });

  it('adds the centre hole as a second subpath', () => {
    expect(gearPath(32, 32, { teeth: 6, tip: 20, root: 15 }).match(/M/g)).toHaveLength(1);
    expect(gearPath(32, 32, { teeth: 6, tip: 20, root: 15, hole: 5 }).match(/M/g)).toHaveLength(2);
  });
});

describe('heartPath', () => {
  it('starts at the bottom point and is mirror-symmetric', () => {
    const d = heartPath(32, 10, 40, 30);
    expect(d.startsWith('M32,40')).toBe(true);
    const xs = numbers(d).filter((_, i) => i % 2 === 0);
    expect(Math.min(...xs) + Math.max(...xs)).toBeCloseTo(64, 5);
  });
});

describe('sparklePath', () => {
  it('reaches `r` at the four tips', () => {
    const d = sparklePath(10, 10, 8);
    expect(d.startsWith('M10,2')).toBe(true);
    expect(d).toContain(' 18,10');
    expect(d).toContain(' 10,18');
    expect(d).toContain(' 2,10');
    expect(d.match(/Q/g)).toHaveLength(4);
  });
});

describe('burstPoints', () => {
  it('alternates outer tips and inner corners', () => {
    const pts = burstPoints(0, 0, 10, 4, 6);
    expect(pts).toHaveLength(12);
    pts.forEach(([x, y], i) => expect(Math.hypot(x, y)).toBeCloseTo(i % 2 === 0 ? 10 : 4, 1));
  });
});
