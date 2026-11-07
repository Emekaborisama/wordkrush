import { describe, expect, it } from 'vitest';
import { decodeShareData } from '../games/share-data';
import { buildStreakSharePayload } from './share';

function payloadOf(url: string) {
  return decodeShareData(/\/share\/([^?/]+)/.exec(url)?.[1] ?? '');
}

describe('a streak share', () => {
  it('is the streak card, its link and one line', () => {
    const share = buildStreakSharePayload({ days: 12, best: 15 });
    expect(share.caption).toBe('12 days in a row on WordKrush. Can you keep up?');
    expect(share.fileName).toBe('wordkrush-streak.png');
    expect(share.imageUrl).toMatch(/\/og\.png$/);
    expect(payloadOf(share.url)).toEqual({ game: 'streak', days: 12, best: 15 });
  });

  it('never claims a best below the streak it is sharing', () => {
    expect(payloadOf(buildStreakSharePayload({ days: 9, best: 4 }).url)).toEqual({ game: 'streak', days: 9, best: 9 });
  });

  it('has its own line for day one', () => {
    expect(buildStreakSharePayload({ days: 1, best: 1 }).caption).toMatch(/Day one/);
  });
});
