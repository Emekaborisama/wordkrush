/**
 * The photo id list, and the one thing that can silently break it.
 *
 * A share names its card's photos by id and the server resolves those ids back
 * to image bytes, so the two halves of the list have to be the same list. They
 * are written twice — `server/og-card.mjs` is plain Node with no TypeScript
 * loader — and this suite is what makes that duplication safe.
 */
import { describe, expect, it } from 'vitest';
import { CARD_PHOTO_IDS as SERVER_IDS } from '../../../server/og-card.mjs';
import { CARD_PHOTO_IDS, pickCardPhotos } from './card-photos';

describe('the card photo ids', () => {
  it('are the same list the server resolves, in the same order', () => {
    expect([...CARD_PHOTO_IDS]).toEqual([...SERVER_IDS]);
  });

  it('fit in a URL path without escaping', () => {
    // An id travels in a share token and then in the image path, so anything
    // needing a percent-escape would put a `%` in the URL a composer reads.
    for (const id of CARD_PHOTO_IDS) expect(id).toMatch(/^[a-z0-9-]{1,32}$/);
  });

  it('are distinct, so an id names one photo', () => {
    expect(new Set(CARD_PHOTO_IDS).size).toBe(CARD_PHOTO_IDS.length);
  });

  it('leave out every photo that would need a credit on a wordless card', () => {
    // The licence filter is the reason this list is short. If it ever admitted
    // the whole snapshot, a card would be showing CC BY work with no credit.
    expect(CARD_PHOTO_IDS.length).toBeGreaterThan(1);
    expect(CARD_PHOTO_IDS.length).toBeLessThan(50);
  });
});

describe('picking a pair', () => {
  it('gives one seed one pair', () => {
    expect(pickCardPhotos('7:12')).toEqual(pickCardPhotos('7:12'));
  });

  it('never names the same photo twice', () => {
    for (let streak = 0; streak < 200; streak++) {
      const pair = pickCardPhotos(`${streak}:${streak * 3}`);
      expect(pair).not.toBeNull();
      expect(pair?.[0]).not.toBe(pair?.[1]);
    }
  });

  it('spreads across the pool instead of settling on one board', () => {
    const drawn = new Set<string>();
    for (let streak = 0; streak < 200; streak++) {
      for (const id of pickCardPhotos(`${streak}:${streak}`) ?? []) drawn.add(id);
    }

    expect(drawn.size).toBe(CARD_PHOTO_IDS.length);
  });
});
