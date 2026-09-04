import { describe, expect, it } from 'vitest';
import { CARD_PHOTO_IDS } from './card-photos';
import { buildShareText } from './share';
import { decodeShareData } from '../share-data';

/** The token out of a paste, without the utm query behind it. */
function sharedToken(text: string): string {
  const url = /https:\/\/wordkrush\.com\/share\/([^?\s]+)/.exec(text);
  expect(url).not.toBeNull();
  return url?.[1] ?? '';
}

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
    // The lines a reader sees. The link's photo ids are card decoration seeded
    // by the standing — `buildShareText` is never told what the pair was.
    const readable = text
      .split('\n')
      .filter((line) => !line.startsWith('http'))
      .join('\n');
    expect(readable).not.toMatch(/sushi|pizza|wikipedia/i);
  });

  it('pastes a link no composer will cut short', () => {
    // A `~` in the token is where `twitter-text` stopped reading the URL, so
    // the link X saw was a prefix of this one and unfurled nothing.
    const token = sharedToken(buildShareText({ streak: 0, bestStreak: 0 }));

    expect(token).not.toMatch(/[~=]/);
    expect(token.at(-1)).toMatch(/[A-Za-z0-9_-]/);
  });

  it('names the two photos its card draws', () => {
    const decoded = decodeShareData(sharedToken(buildShareText({ streak: 7, bestStreak: 12 })));

    expect(decoded?.game).toBe('more-or-less');
    const photos = decoded?.game === 'more-or-less' ? decoded.photos : undefined;
    expect(photos).toHaveLength(2);
    expect(photos?.[0]).not.toBe(photos?.[1]);
    for (const id of photos ?? []) expect(CARD_PHOTO_IDS).toContain(id);
  });

  it('gives one result one board, however often it is shared', () => {
    // Seeded, not random: the card is part of the result, so sharing the same
    // run twice has to produce the same link and therefore the same board.
    const first = sharedToken(buildShareText({ streak: 7, bestStreak: 12 }));
    const second = sharedToken(buildShareText({ streak: 7, bestStreak: 12 }));

    expect(second).toBe(first);
  });
});
