import { describe, expect, it } from 'vitest';
import { decodeShareData } from '../games/share-data';
import { buildStreakShareText } from './share';

function tokenOf(text: string) {
  const url = text.split('\n').at(-1) ?? '';
  return decodeShareData(new URL(url).pathname.replace('/share/', ''));
}

describe('the streak paste', () => {
  it('leads with the days and ends on a wordkrush.com share link', () => {
    const text = buildStreakShareText({ days: 12, best: 15 });
    const lines = text.split('\n');
    expect(lines[0]).toBe('WordKrush 🔥 12-day streak');
    expect(lines).toContain('Best 15');
    expect(lines.at(-1)).toMatch(/^https:\/\/wordkrush\.com\/share\/[A-Za-z0-9_-]+\?utm_source=player&utm_medium=share$/);
  });

  it('carries the streak in the link so the card can draw it', () => {
    expect(tokenOf(buildStreakShareText({ days: 12, best: 15 }))).toEqual({ game: 'streak', days: 12, best: 15 });
  });

  it('never claims a best below the streak it is sharing', () => {
    const text = buildStreakShareText({ days: 9, best: 4 });
    expect(text).toContain('My longest yet');
    expect(tokenOf(text)).toEqual({ game: 'streak', days: 9, best: 9 });
  });
});
