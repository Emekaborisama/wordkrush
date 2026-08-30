import { describe, expect, it } from 'vitest';
import { SHARE_URL } from '../share';
import { buildShareText } from './share';

describe('buildShareText', () => {
  it('tiers squares by word length and names the level', () => {
    expect(
      buildShareText({
        levelNumber: 7,
        levelName: 'Tidewrack',
        score: 2340,
        wordLengths: [4, 4, 6, 4, 8, 6, 4, 8],
        elapsedMs: 102_000,
        won: true,
      }),
    ).toBe(
      `WordKrush · Wordfall L7 “Tidewrack”\n🟦🟦🟨🟦🟩🟨🟦🟩\n2,340 pts · 8 words · 1:42\n${SHARE_URL}`,
    );
  });

  it('marks a loss without listing the words that fell short', () => {
    const text = buildShareText({
      levelNumber: 2,
      levelName: 'First Drop',
      score: 120,
      wordLengths: [3, 5],
      elapsedMs: 43_400,
      won: false,
    });
    expect(text).toContain('Almost there.');
    expect(text).toContain('120 pts · 2 words · 0:43');
  });

  it('omits the grid when no word was found', () => {
    const rows = buildShareText({
      levelNumber: 1,
      levelName: 'Spark',
      score: 0,
      wordLengths: [],
      elapsedMs: 0,
      won: false,
    }).split('\n');
    expect(rows[1]).toBe('0 pts · 0 words · 0:00');
  });

  it('never prints a played word', () => {
    const text = buildShareText({
      levelNumber: 7,
      levelName: 'Tidewrack',
      score: 80,
      wordLengths: [5, 7],
      elapsedMs: 8_000,
      won: true,
    });
    expect(text).not.toMatch(/\b(crate|ember|nova|beam|flare|trace)\b/i);
  });
});
