import { describe, expect, it } from 'vitest';
import { buildShareText } from './share';

describe('buildShareText', () => {
  it('closes a short run with the miss that ended it', () => {
    const text = buildShareText({ streak: 2, bestStreak: 15 });
    expect(text).toContain('WordKrush · More or Less');
    expect(text).toContain('🟩🟩🟥');
    expect(text).toContain('Streak 2 · best 15');
    expect(text).toContain('A start. Then one miss.');
    expect(text).toMatch(/https:\/\/wordkrush\.com\/share\/.+\?utm_source=player&utm_medium=share/);
  });

  it('is just the miss at streak zero', () => {
    const text = buildShareText({ streak: 0, bestStreak: 8 });
    expect(text).toContain('\n🟥\n');
    expect(text).toContain('Gone in one.');
  });

  it('uses the mid-run verdict for a streak of 12', () => {
    const text = buildShareText({ streak: 12, bestStreak: 15 });
    expect(text).toContain('Held the line, then blinked.');
    expect(text).toContain('Streak 12 · best 15');
  });

  it('wraps at ten and starts a new row when the tenth was correct', () => {
    const rows = buildShareText({ streak: 10, bestStreak: 10 }).split('\n');
    expect(rows[1]).toBe('🟩'.repeat(10));
    expect(rows[2]).toBe('🟥');
  });

  it('summarises instead of drawing an unreadable wall of squares', () => {
    const text = buildShareText({ streak: 58, bestStreak: 58 });
    expect(text).toContain('+8 more 🟥');
    expect((text.match(/🟩/gu) ?? []).length).toBe(50);
  });

  it('includes local rank when it is provided', () => {
    expect(buildShareText({ streak: 4, bestStreak: 9, rank: 3 })).toContain(
      'Streak 4 · best 9 · #3',
    );
  });

  it('leaks nothing about the pair that ended the run', () => {
    const text = buildShareText({ streak: 9, bestStreak: 9 });
    const grid = text.split('\n')[1] ?? '';
    expect(grid).toMatch(/^[🟩🟥]+$/u);
    expect(text).not.toMatch(/sushi|pizza|wikipedia/i);
  });
});
