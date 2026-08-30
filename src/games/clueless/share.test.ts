import { describe, expect, it } from 'vitest';
import { buildShareText } from './share';

describe('buildShareText', () => {
  it('draws a cold-to-hot heat spread and names the puzzle', () => {
    const text = buildShareText({
      puzzleNumber: 23,
      guesses: [
        { rank: 1 },
        { rank: 8 },
        { rank: 40 },
        { rank: 400 },
        { rank: null },
        { rank: null },
      ],
    });
    expect(text).toContain('WordKrush · Clueless #23');
    expect(text).toContain('⬛⬛🟥🟧🟨🟩');
    expect(text).toContain('Found it in 6');
    expect(text).toContain('3 cold shots, one clean hit.');
    expect(text).toMatch(/https:\/\/wordkrush\.com\/share\/.+\?utm_source=player&utm_medium=share/);
  });

  it('appends the level name when one is supplied', () => {
    const text = buildShareText({
      puzzleNumber: 23,
      levelName: 'Sound Check',
      guesses: [{ rank: 1 }],
    });
    expect(text.startsWith('WordKrush · Clueless #23 · Sound Check\n')).toBe(true);
  });

  it('sorts a jumbled rank list into a monotonic spread', () => {
    const rows = buildShareText({
      puzzleNumber: 4,
      guesses: [{ rank: 3 }, { rank: null }, { rank: 200 }, { rank: 1 }],
    }).split('\n');
    expect(rows[1]).toBe('⬛🟥🟨🟩');
  });

  it('celebrates a first-guess solve', () => {
    const text = buildShareText({ puzzleNumber: 1, guesses: [{ rank: 1 }] });
    expect(text).toContain("First word. That's rude.");
    expect(text).toContain('Found it in 1');
  });

  it('never prints a guessed word or the secret', () => {
    const text = buildShareText({
      puzzleNumber: 23,
      guesses: [{ rank: 12 }, { rank: 1 }],
    });
    expect(text).not.toMatch(/apple|secret|guess/i);
    expect(text).not.toContain('rank');
  });
});
