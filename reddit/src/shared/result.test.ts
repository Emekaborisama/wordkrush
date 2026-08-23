import { describe, expect, it } from 'vitest';
import { buildShareText } from './result';

const base = { dayLabel: 'Sat 23 Aug', rank: 7, players: 143 };

describe('buildShareText', () => {
  it('closes the grid with the miss that ended the run', () => {
    expect(buildShareText({ ...base, streak: 4 })).toBe(
      'More or Less — Sat 23 Aug\n🟩🟩🟩🟩🟥\nStreak 4 · #7 of 143 today',
    );
  });

  it('is just the miss at streak zero', () => {
    expect(buildShareText({ ...base, streak: 0 })).toContain('\n🟥\n');
  });

  it('wraps at ten and starts a new row when the tenth was correct', () => {
    const rows = buildShareText({ ...base, streak: 10 }).split('\n');
    expect(rows[1]).toBe('🟩'.repeat(10));
    expect(rows[2]).toBe('🟥');
  });

  it('continues a partial row rather than starting one', () => {
    const rows = buildShareText({ ...base, streak: 11 }).split('\n');
    expect(rows[1]).toBe('🟩'.repeat(10));
    expect(rows[2]).toBe('🟩🟥');
  });

  it('drops the standing when the run was not ranked', () => {
    const text = buildShareText({ ...base, streak: 3, rank: null });
    expect(text).toContain('Streak 3');
    expect(text).not.toContain('#');
  });

  it('summarises instead of drawing an unreadable wall of squares', () => {
    const text = buildShareText({ ...base, streak: 58 });
    expect(text).toContain('+8 more');
    expect((text.match(/🟩/gu) ?? []).length).toBe(50);
  });

  /**
   * The reason this format exists. Everyone on a post plays the same sequence,
   * so a result that leaked an item, a value, or a direction would poison the
   * thread for every later reader.
   */
  it('leaks nothing about the run itself', () => {
    const text = buildShareText({ ...base, streak: 9 });
    // Everything below the title line is squares and a standing. No item label,
    // no value, and no hint about which side won any round.
    const body = text.split('\n').slice(1).join('\n');
    expect(body).not.toMatch(/more|less/i);
    expect(body).toMatch(/^[🟩🟥\n]+\nStreak/u);
    // The only digits anywhere are the day, the streak, and the standing.
    const digits = text.match(/\d+/g) ?? [];
    expect(digits).toEqual(['23', '9', '7', '143']);
  });
});
