/**
 * The glyph reader the branded cards draw their lettering with.
 */
import { describe, expect, it } from 'vitest';

import { CARD_FACES, measureText, textPath } from './glyphs.mjs';

describe('lettering as outlines', () => {
  it('turns words into closed contours in both card faces', () => {
    for (const face of Object.keys(CARD_FACES)) {
      const { d, width } = textPath('Level 12!', { face, size: 64, x: 0, y: 64, anchor: 'start' });
      expect(d).toMatch(/^M[\d.-]+ [\d.-]+/);
      expect(d.match(/Z/g)?.length ?? 0).toBeGreaterThan(8);
      expect(width).toBeGreaterThan(200);
    }
  });

  it('draws accented letters from their composite parts', () => {
    const plain = textPath('e', { size: 64, x: 0, y: 64 });
    const accented = textPath('é', { size: 64, x: 0, y: 64 });
    expect(accented.d.length).toBeGreaterThan(plain.d.length);
  });

  it('scales width with size, and anchors on the middle by default', () => {
    expect(measureText('Krush', { size: 100 })).toBeCloseTo(measureText('Krush', { size: 50 }) * 2, 5);
    const { d } = textPath('I', { size: 100, x: 500, y: 100 });
    const xs = [...d.matchAll(/[ML]([\d.]+) /g)].map((m) => Number(m[1]));
    expect(Math.min(...xs)).toBeLessThan(500);
    expect(Math.max(...xs)).toBeGreaterThan(500);
  });

  it('refuses a character the face cannot draw, rather than drawing a box', () => {
    expect(() => textPath('Score 🟩', { size: 40, x: 0, y: 40 })).toThrow(/no glyph/);
  });

  it('draws a space as width, not ink', () => {
    expect(textPath(' ', { size: 40, x: 0, y: 40 }).d).toBe('');
    expect(measureText('a b', { size: 40 })).toBeGreaterThan(measureText('ab', { size: 40 }));
  });
});
