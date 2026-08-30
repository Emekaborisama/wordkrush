import { describe, expect, it } from 'vitest';
import { composeShare, wrapSquares } from './share';

const TEST_SHARE_URL = 'https://wordkrush.com/share/test123?utm_source=player&utm_medium=share';

describe('composeShare', () => {
  it('joins title, grid, standing, and the tracked URL', () => {
    expect(
      composeShare({
        title: 'WordKrush · More or Less',
        grid: '🟩🟩🟥',
        standing: 'Streak 2',
        url: TEST_SHARE_URL,
      }),
    ).toBe(`WordKrush · More or Less\n🟩🟩🟥\nStreak 2\n${TEST_SHARE_URL}`);
  });

  it('omits an empty grid rather than leaving a blank line', () => {
    const text = composeShare({
      title: 'WordKrush · Wordfall L1',
      grid: '',
      standing: '0 pts · 0 words · 0:00',
      url: TEST_SHARE_URL,
    });
    expect(text.split('\n')).toEqual([
      'WordKrush · Wordfall L1',
      '0 pts · 0 words · 0:00',
      TEST_SHARE_URL,
    ]);
  });

  it('inserts a verdict between the standing and the URL', () => {
    const text = composeShare({
      title: 'WordKrush · More or Less',
      grid: '🟥',
      standing: 'Streak 0',
      verdict: 'Gone in one.',
      url: TEST_SHARE_URL,
    });
    expect(text.endsWith(`Gone in one.\n${TEST_SHARE_URL}`)).toBe(true);
  });
});

describe('wrapSquares', () => {
  it('wraps at ten squares', () => {
    expect(wrapSquares('🟩'.repeat(12))).toBe(`${'🟩'.repeat(10)}\n🟩🟩`);
  });

  it('caps the drawn squares and names the overflow', () => {
    expect(wrapSquares('🟦'.repeat(52))).toContain('+2 more');
    expect((wrapSquares('🟦'.repeat(52)).match(/🟦/gu) ?? []).length).toBe(50);
  });
});
