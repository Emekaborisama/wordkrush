/**
 * A Clueless share: the card with the heat spread, its link, and one line
 * daring the reader to find the word in fewer guesses.
 *
 * Buckets only, never the secret or a guessed word. The card draws the
 * spread cold to hot, so the order the guesses came in is gone too.
 */
import { rankBucket } from '../../analytics/events';
import type { SharePayload } from '../share';
import { buildShareImageUrl, buildShareUrl, shareFileName, type CluelessShareData } from '../share-data';

export type CluelessShareGuess = {
  rank: number | null;
};

export type CluelessShareInput = {
  puzzleNumber: number;
  levelName?: string;
  guesses: CluelessShareGuess[];
};

export function buildSharePayload(input: CluelessShareInput): SharePayload {
  const count = input.guesses.length;
  const heatBuckets = { unranked: 0, cold: 0, top_100: 0, top_10: 0, win: 0 };
  for (const guess of input.guesses) heatBuckets[rankBucket(guess.rank)]++;

  const data: CluelessShareData = {
    game: 'clueless',
    puzzleNumber: input.puzzleNumber,
    levelName: input.levelName,
    guessCount: count,
    heatBuckets,
  };

  const caption =
    count <= 1
      ? `I found the Clueless #${input.puzzleNumber} word on my first guess. Can you match it?`
      : `I found the Clueless #${input.puzzleNumber} word in ${count} guesses. Can you do better?`;

  return {
    caption,
    url: buildShareUrl(data),
    imageUrl: buildShareImageUrl(data),
    fileName: shareFileName('clueless'),
  };
}
