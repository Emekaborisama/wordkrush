/**
 * A Wordfall share: the card with the word-length grid and the score, its
 * link, and one line daring the reader to beat it.
 *
 * Never `played[]`: levels are numbered and shared, so the words themselves
 * are spoilers. The card draws lengths only.
 */
import { wordLengthBucket } from '../../analytics/events';
import type { SharePayload } from '../share';
import { buildShareImageUrl, buildShareUrl, shareFileName, type WordfallShareData } from '../share-data';

export type WordfallShareInput = {
  levelNumber: number;
  levelName: string;
  score: number;
  wordLengths: number[];
  won: boolean;
};

export function buildSharePayload(input: WordfallShareInput): SharePayload {
  const lengthBuckets = { under_3: 0, '3_4': 0, '5_7': 0, '8_plus': 0 };
  for (const length of input.wordLengths) lengthBuckets[wordLengthBucket(length)]++;

  const data: WordfallShareData = {
    game: 'wordfall',
    levelNumber: input.levelNumber,
    levelName: input.levelName,
    score: input.score,
    wordCount: input.wordLengths.length,
    lengthBuckets,
    won: input.won,
  };

  const score = input.score.toLocaleString('en-US');
  const caption = input.won
    ? `I cleared Wordfall level ${input.levelNumber} with ${score} points. Can you beat it?`
    : `So close on Wordfall level ${input.levelNumber}. Can you clear it?`;

  return {
    caption,
    url: buildShareUrl(data),
    imageUrl: buildShareImageUrl(data),
    fileName: shareFileName('wordfall'),
  };
}
