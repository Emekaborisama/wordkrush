import { describe, expect, it } from 'vitest';
import {
  bannerPath,
  cloudBank,
  digitCells,
  DIGIT_PIXELS,
  extrusionOffsets,
  rayWedgePath,
  roundedPolygonPath,
  starPath,
  starPoints,
  strokeOffsets,
  tabPath,
} from './shapes';

describe('strokeOffsets', () => {
  it('draws nothing for a zero or invalid width', () => {
    expect(strokeOffsets(0)).toEqual([]);
    expect(strokeOffsets(-2)).toEqual([]);
    expect(strokeOffsets(Number.NaN)).toEqual([]);
  });

  it('uses eight copies up to 2px and sixteen past it', () => {
    expect(strokeOffsets(1.5)).toHaveLength(8);
    expect(strokeOffsets(2)).toHaveLength(8);
    expect(strokeOffsets(3)).toHaveLength(16);
  });

  it('places every copy on the ring of the stroke width', () => {
    for (const [x, y] of strokeOffsets(3)) {
      expect(Math.hypot(x, y)).toBeCloseTo(3, 1);
    }
  });
});

describe('extrusionOffsets', () => {
  it('pushes three copies below the outline', () => {
    const offsets = extrusionOffsets(2, 2);
    expect(offsets).toHaveLength(3);
    for (const [, y] of offsets) expect(y).toBe(4);
  });

  it('is empty without depth', () => {
    expect(extrusionOffsets(2, 0)).toEqual([]);
  });
});

describe('roundedPolygonPath', () => {
  it('refuses fewer than three points', () => {
    expect(roundedPolygonPath([[0, 0], [1, 1]], 2)).toBe('');
  });

  it('closes the path with one curve per corner', () => {
    const path = roundedPolygonPath(
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
      2,
    );
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
    expect(path.match(/Q/g)).toHaveLength(4);
  });

  it('clamps the radius to half of a short edge', () => {
    // A radius bigger than the square would otherwise overshoot its corners.
    const path = roundedPolygonPath(
      [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
      ],
      50,
    );
    const numbers = path.match(/-?\d+(\.\d+)?/g)!.map(Number);
    for (const n of numbers) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(4);
    }
  });
});

describe('tabPath', () => {
  it('stays inside its box', () => {
    const numbers = tabPath(200, 44, 12, 10).match(/-?\d+(\.\d+)?/g)!.map(Number);
    for (let i = 0; i < numbers.length; i += 2) {
      expect(numbers[i]!).toBeGreaterThanOrEqual(0);
      expect(numbers[i]!).toBeLessThanOrEqual(200);
      expect(numbers[i + 1]!).toBeGreaterThanOrEqual(0);
      expect(numbers[i + 1]!).toBeLessThanOrEqual(44);
    }
  });
});

describe('stars', () => {
  it('alternates outer and inner radius, first point straight up', () => {
    const points = starPoints(50, 50, 40, 20);
    expect(points).toHaveLength(10);
    expect(points[0]![0]).toBeCloseTo(50, 5);
    expect(points[0]![1]).toBeCloseTo(10, 5);
    expect(Math.hypot(points[1]![0] - 50, points[1]![1] - 50)).toBeCloseTo(20, 5);
  });

  it('rounds every tip', () => {
    expect(starPath(50, 50, 40).match(/Q/g)).toHaveLength(10);
  });
});

describe('bannerPath and rayWedgePath', () => {
  it('builds closed paths', () => {
    expect(bannerPath(200, 40, 6)).toMatch(/^M.*Z$/);
    expect(rayWedgePath(100, 0, 300, 90, 10)).toMatch(/^M100,0 L.* Z$/);
  });
});

describe('cloudBank', () => {
  it('covers the full width and is deterministic', () => {
    const a = cloudBank(390, 800);
    const b = cloudBank(390, 800);
    expect(a).toEqual(b);
    const right = Math.max(...a.map((c) => c.cx + c.r));
    const left = Math.min(...a.map((c) => c.cx - c.r));
    expect(left).toBeLessThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(390);
  });
});

describe('digitCells', () => {
  it('has a 3×5 glyph for every digit', () => {
    for (let d = 0; d <= 9; d += 1) {
      const rows = DIGIT_PIXELS[String(d)]!;
      expect(rows).toHaveLength(5);
      for (const row of rows) expect(row).toMatch(/^[01]{3}$/);
    }
  });

  it('spaces glyphs one column apart', () => {
    const one = digitCells('8');
    const two = digitCells('88');
    expect(one.cols).toBe(3);
    expect(two.cols).toBe(7);
    expect(two.cells).toHaveLength(one.cells.length * 2);
    expect(Math.max(...two.cells.map(([x]) => x))).toBe(6);
  });

  it('skips anything that is not a digit', () => {
    expect(digitCells('a1b')).toEqual(digitCells('1'));
    expect(digitCells('')).toEqual({ cols: 0, rows: 5, cells: [] });
  });
});
