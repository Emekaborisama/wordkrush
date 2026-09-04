/**
 * Card identity.
 *
 * `serve.test.mjs` owns the response contract and `og-image.test.mjs` owns what
 * gets drawn. This suite owns the thing in between: the id that says which card
 * a result unfurls to, which is both the URL a composer fetches and the key the
 * render is cached under.
 */
import { describe, expect, it } from 'vitest';

import {
  CARD_IMAGE_ROUTE,
  CARD_PHOTO_IDS,
  cardFromId,
  cardId,
  cardImagePath,
  cardPhotoIdsFor,
  isDrawableShare,
} from './og-card.mjs';

const RESULTS = {
  'more-or-less': { game: 'more-or-less', streak: 7, bestStreak: 12 },
  clueless: {
    game: 'clueless',
    puzzleNumber: 29,
    levelName: 'Departure Board',
    guessCount: 4,
    heatBuckets: { unranked: 1, cold: 1, top_100: 1, top_10: 0, win: 1 },
  },
  wordfall: {
    game: 'wordfall',
    levelNumber: 6,
    levelName: 'Tide Line',
    score: 4820,
    wordCount: 9,
    lengthBuckets: { under_3: 0, '3_4': 4, '5_7': 4, '8_plus': 1 },
    won: true,
  },
};

describe('a card id', () => {
  it.each(Object.keys(RESULTS))('round-trips a %s result', (game) => {
    const id = cardId(RESULTS[game]);

    expect(cardFromId(id)?.game).toBe(game);
  });

  it('is a path a composer will follow to the end', () => {
    for (const result of Object.values(RESULTS)) {
      const path = cardImagePath(cardId(result));

      // `twitter-text` will not end a URL on `~`, which is what the old `=`
      // padding was written as. Nothing here is outside base64url plus `_`.
      expect(path).not.toMatch(/[~=+%]/);
      expect(CARD_IMAGE_ROUTE.exec(path)?.[1]).toBe(cardId(result));
    }
  });

  it('names a More or Less board by its two photos, and nothing else', () => {
    const id = cardId({ ...RESULTS['more-or-less'], photos: ['blue-whale', 'mona-lisa'] });

    expect(id).toBe('m_blue-whale_mona-lisa');
    expect(cardFromId(id).photos).toEqual(['blue-whale', 'mona-lisa']);
  });

  it('keeps every More or Less card on a path as short as the homepage lockup', () => {
    // `/og-image.png` is the card X's composer already unfurls, and the card it
    // would not was `/share/{the whole result payload}/og.png`. Two photo ids
    // are all a More or Less board draws, so that is all its URL carries.
    for (const top of CARD_PHOTO_IDS) {
      for (const bottom of CARD_PHOTO_IDS) {
        if (top === bottom) continue;
        const path = cardImagePath(cardId({ ...RESULTS['more-or-less'], photos: [top, bottom] }));
        expect(path.length).toBeLessThanOrEqual(48);
      }
    }
  });

  it('is the same for a card whatever the run behind it scored', () => {
    // A More or Less card draws no counters, so two runs that named the same
    // photos are one card and one render, not two.
    const photos = ['japan', 'titanic'];

    expect(cardId({ game: 'more-or-less', streak: 0, bestStreak: 0, photos })).toBe(
      cardId({ game: 'more-or-less', streak: 41, bestStreak: 41, photos }),
    );
  });
});

describe('the photos a card draws', () => {
  it('are the ones the share named', () => {
    expect(cardPhotoIdsFor({ ...RESULTS['more-or-less'], photos: ['egypt', 'spotify'] })).toEqual([
      'egypt',
      'spotify',
    ]);
  });

  it('are derived, stably, for a share made before ids travelled in the token', () => {
    const legacy = { game: 'more-or-less', streak: 7, bestStreak: 12 };
    const [top, bottom] = cardPhotoIdsFor(legacy);

    expect(cardPhotoIdsFor(legacy)).toEqual([top, bottom]);
    expect(top).not.toBe(bottom);
    expect(CARD_PHOTO_IDS).toContain(top);
    expect(CARD_PHOTO_IDS).toContain(bottom);
  });

  it('ignore ids no photo answers to', () => {
    // A token is whatever a stranger put in a URL. An unknown id cannot be
    // drawn, so the card falls back to a derived pair rather than a blank slot.
    const [top, bottom] = cardPhotoIdsFor({
      game: 'more-or-less',
      streak: 1,
      bestStreak: 1,
      photos: ['../../etc/passwd', 'blue-whale'],
    });

    expect(CARD_PHOTO_IDS).toContain(top);
    expect(CARD_PHOTO_IDS).toContain(bottom);
    // And an id built from that token still addresses a card rather than
    // carrying a stranger's path separators into the URL a page declares.
    const path = cardImagePath(
      cardId({ game: 'more-or-less', streak: 1, bestStreak: 1, photos: ['a/b', '../c'] }),
    );
    expect(CARD_IMAGE_ROUTE.test(path)).toBe(true);
  });

  it('are never the same photo twice', () => {
    const doubled = { game: 'more-or-less', streak: 2, bestStreak: 2, photos: ['japan', 'japan'] };
    const [top, bottom] = cardPhotoIdsFor(doubled);

    expect(top).not.toBe(bottom);
  });
});

describe('reading a card id that was not one we wrote', () => {
  it('refuses an unknown game, an unknown photo, and a doubled slot', () => {
    expect(cardFromId('x_japan_titanic')).toBeNull();
    expect(cardFromId('m_japan_not-a-photo')).toBeNull();
    expect(cardFromId('m_japan_japan')).toBeNull();
    expect(cardFromId('m_japan')).toBeNull();
    expect(cardFromId('m_japan_titanic_egypt')).toBeNull();
    expect(cardFromId('nonsense')).toBeNull();
  });

  it('refuses a payload the renderer would choke on', () => {
    // `Array(data.heatBuckets.cold)` is a grid square per guess, so a count
    // that is not a count is an allocation request, not a card.
    const hostile = Buffer.from(
      JSON.stringify({ game: 'clueless', puzzleNumber: 1, guessCount: 1, heatBuckets: {} }),
      'utf-8',
    ).toString('base64url');
    const huge = Buffer.from(
      JSON.stringify({
        game: 'clueless',
        puzzleNumber: 1,
        guessCount: 1,
        heatBuckets: { unranked: 2e9, cold: 0, top_100: 0, top_10: 0, win: 0 },
      }),
      'utf-8',
    ).toString('base64url');

    expect(cardFromId(`c_${hostile}`)).toBeNull();
    expect(cardFromId(`c_${huge}`)).toBeNull();
    expect(cardFromId(`w_${hostile}`)).toBeNull();
  });

  it('refuses a card id whose payload is a different game', () => {
    expect(cardFromId(`w_${cardId(RESULTS.clueless).slice(2)}`)).toBeNull();
  });
});

describe('what counts as a share at all', () => {
  it('accepts the three results the app produces', () => {
    for (const result of Object.values(RESULTS)) expect(isDrawableShare(result)).toBe(true);
  });

  it('rejects a payload that names no game, or names one it cannot draw', () => {
    expect(isDrawableShare(null)).toBe(false);
    expect(isDrawableShare({ streak: 3 })).toBe(false);
    expect(isDrawableShare({ game: 'chess', streak: 3, bestStreak: 3 })).toBe(false);
    expect(isDrawableShare({ game: 'more-or-less', streak: -1, bestStreak: 0 })).toBe(false);
    expect(isDrawableShare({ game: 'more-or-less', streak: 1.5, bestStreak: 0 })).toBe(false);
    expect(isDrawableShare({ game: 'more-or-less', streak: 0 })).toBe(false);
  });
});
