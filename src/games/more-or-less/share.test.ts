import { describe, expect, it } from 'vitest';
import { CARD_PHOTO_IDS } from './card-photos';
import { buildDailySharePayload, buildSharePayload } from './share';
import { decodeShareData } from '../share-data';

/** The token out of a share link, without the utm query behind it. */
function tokenOf(url: string): string {
  const match = /^https:\/\/wordkrush\.com\/share\/([^?/]+)/.exec(url);
  expect(match).not.toBeNull();
  return match?.[1] ?? '';
}

describe('a Higher or Lower share', () => {
  it('is the card, its link and one line daring the reader, with no grid', () => {
    const share = buildSharePayload({ streak: 12, bestStreak: 15 });
    expect(share.caption).toBe('I called 12 in a row on Higher or Lower. Can you beat it?');
    expect(share.caption).not.toMatch(/[🟩🟥\n]/u);
    expect(share.imageUrl).toBe(`https://wordkrush.com/share/${tokenOf(share.url)}/og.png`);
    expect(share.fileName).toBe('wordkrush-higher-or-lower.png');
  });

  it('has its own line for a run that ended on the first pair', () => {
    expect(buildSharePayload({ streak: 0, bestStreak: 4 }).caption).toMatch(/first pair/);
  });

  it('leaks nothing about the pair that ended the run', () => {
    // The card draws photos seeded by the standing; the builder is never told the pair.
    expect(buildSharePayload({ streak: 9, bestStreak: 9 }).caption).not.toMatch(/sushi|pizza|wikipedia/i);
  });

  it('links to a token no composer will cut short', () => {
    // A `~` in the token is where `twitter-text` stopped reading the URL.
    const token = tokenOf(buildSharePayload({ streak: 0, bestStreak: 0 }).url);
    expect(token).not.toMatch(/[~=]/);
    expect(token.at(-1)).toMatch(/[A-Za-z0-9_-]/);
  });

  it('names the two photos its card draws, the same pair every time', () => {
    const first = buildSharePayload({ streak: 7, bestStreak: 12 });
    const decoded = decodeShareData(tokenOf(first.url));
    const photos = decoded?.game === 'more-or-less' ? decoded.photos : undefined;
    expect(photos).toHaveLength(2);
    expect(photos?.[0]).not.toBe(photos?.[1]);
    for (const id of photos ?? []) expect(CARD_PHOTO_IDS).toContain(id);
    expect(buildSharePayload({ streak: 7, bestStreak: 12 })).toEqual(first);
  });

  it('carries a level run as a challenge, and says so', () => {
    const share = buildSharePayload({ streak: 7, bestStreak: 9, challenge: { seed: 42, path: 'world', level: 2 } });
    expect(share.caption).toBe('Beat my streak of 7 on Higher or Lower. Same pairs, same order.');
    expect(decodeShareData(tokenOf(share.url))).toMatchObject({ streak: 7, challenge: { seed: 42, path: 'world', level: 2 } });
  });
});

describe('a Daily 10 share', () => {
  it('names the day and the score out of ten', () => {
    expect(buildDailySharePayload({ number: 3, streak: 7, bestStreak: 7 }).caption).toBe(
      '7/10 on WordKrush Daily #3. Same ten pairs for everyone today.',
    );
  });

  it('calls a perfect ten perfect', () => {
    expect(buildDailySharePayload({ number: 3, streak: 10, bestStreak: 10 }).caption).toBe('A perfect 10/10 on WordKrush Daily #3. Your turn.');
  });
});
