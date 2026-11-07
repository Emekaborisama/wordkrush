import { describe, expect, it } from 'vitest';
import { decodeShareData } from '../share-data';
import { buildSharePayload } from './share';

function payloadOf(url: string) {
  return decodeShareData(/\/share\/([^?/]+)/.exec(url)?.[1] ?? '');
}

describe('a Clueless share', () => {
  it('dares the reader to beat the guess count, with the card attached', () => {
    const share = buildSharePayload({ puzzleNumber: 12, levelName: 'Kitchen', guesses: [{ rank: null }, { rank: 300 }, { rank: 50 }, { rank: 1 }] });
    expect(share.caption).toBe('I found the Clueless #12 word in 4 guesses. Can you do better?');
    expect(share.imageUrl).toMatch(/^https:\/\/wordkrush\.com\/share\/[A-Za-z0-9_-]+\/og\.png$/);
    expect(share.fileName).toBe('wordkrush-clueless.png');
  });

  it('counts the heat buckets the card draws', () => {
    const share = buildSharePayload({ puzzleNumber: 12, guesses: [{ rank: null }, { rank: 300 }, { rank: 50 }, { rank: 5 }, { rank: 1 }] });
    expect(payloadOf(share.url)).toMatchObject({
      game: 'clueless',
      guessCount: 5,
      heatBuckets: { unranked: 1, cold: 1, top_100: 1, top_10: 1, win: 1 },
    });
  });

  it('has its own line for a first-guess solve', () => {
    expect(buildSharePayload({ puzzleNumber: 3, guesses: [{ rank: 1 }] }).caption).toMatch(/first guess/);
  });

  it('never carries a guessed word or the secret', () => {
    const share = buildSharePayload({ puzzleNumber: 3, guesses: [{ rank: 40 }, { rank: 1 }] });
    expect(JSON.stringify(payloadOf(share.url))).not.toMatch(/word"|secret|guess":/);
  });
});
