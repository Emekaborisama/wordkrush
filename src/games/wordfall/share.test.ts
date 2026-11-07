import { describe, expect, it } from 'vitest';
import { decodeShareData } from '../share-data';
import { buildSharePayload } from './share';

function payloadOf(url: string) {
  return decodeShareData(/\/share\/([^?/]+)/.exec(url)?.[1] ?? '');
}

describe('a Wordfall share', () => {
  it('dares the reader to beat a cleared level, with the card attached', () => {
    const share = buildSharePayload({ levelNumber: 4, levelName: 'Garden', score: 1240, wordLengths: [3, 4, 5, 8], won: true });
    expect(share.caption).toBe('I cleared Wordfall level 4 with 1,240 points. Can you beat it?');
    expect(share.fileName).toBe('wordkrush-wordfall.png');
    expect(payloadOf(share.url)).toMatchObject({
      levelNumber: 4,
      score: 1240,
      wordCount: 4,
      lengthBuckets: { under_3: 0, '3_4': 2, '5_7': 1, '8_plus': 1 },
      won: true,
    });
  });

  it('asks for the clear when the level was lost', () => {
    expect(buildSharePayload({ levelNumber: 4, levelName: 'Garden', score: 300, wordLengths: [3], won: false }).caption).toBe(
      'So close on Wordfall level 4. Can you clear it?',
    );
  });

  it('never carries a played word', () => {
    const share = buildSharePayload({ levelNumber: 4, levelName: 'Garden', score: 300, wordLengths: [5], won: true });
    expect(JSON.stringify(payloadOf(share.url))).not.toMatch(/played|words"/);
  });
});
