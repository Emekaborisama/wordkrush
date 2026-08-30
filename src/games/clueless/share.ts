/**
 * Spoiler-free Clueless result paste.
 *
 * A heat *spread*, not a journey: guesses are already sorted by rank in the
 * engine (`sortGuesses`), so chronological order is gone by the time the win
 * card renders. The grid is therefore monotonic cold → hot. Never the secret
 * and never any guessed word — buckets only.
 */
import { rankBucket } from '../../analytics/events';
import { composeShare, wrapSquares } from '../share';
import { buildShareUrl, type CluelessShareData } from '../share-data';

const HEAT = {
  unranked: { emoji: '⬛', order: 0 },
  cold: { emoji: '🟥', order: 1 },
  top_100: { emoji: '🟧', order: 2 },
  top_10: { emoji: '🟨', order: 3 },
  win: { emoji: '🟩', order: 4 },
} as const;

export type CluelessShareGuess = {
  rank: number | null;
};

export type CluelessShareInput = {
  puzzleNumber: number;
  levelName?: string;
  guesses: CluelessShareGuess[];
};

export function buildShareText(input: CluelessShareInput): string {
  const count = input.guesses.length;

  // Count heat buckets for share data (no spoilers)
  const heatBuckets = {
    unranked: 0,
    cold: 0,
    top_100: 0,
    top_10: 0,
    win: 0,
  };
  for (const guess of input.guesses) {
    const bucket = rankBucket(guess.rank);
    heatBuckets[bucket]++;
  }

  const shareData: CluelessShareData = {
    game: 'clueless',
    puzzleNumber: input.puzzleNumber,
    levelName: input.levelName,
    guessCount: count,
    heatBuckets,
  };

  return composeShare({
    title: cluelessTitle(input),
    grid: cluelessGrid(input.guesses),
    standing: `Found it in ${count}`,
    verdict: cluelessVerdict(input.guesses),
    url: buildShareUrl(shareData),
  });
}

function cluelessTitle({ puzzleNumber, levelName }: CluelessShareInput): string {
  const base = `WordKrush · Clueless #${puzzleNumber}`;
  return levelName !== undefined && levelName.length > 0 ? `${base} · ${levelName}` : base;
}

function cluelessGrid(guesses: CluelessShareGuess[]): string {
  const cells = guesses
    .map((guess) => HEAT[rankBucket(guess.rank)])
    .sort((a, b) => a.order - b.order)
    .map((cell) => cell.emoji)
    .join('');
  return wrapSquares(cells);
}

function cluelessVerdict(guesses: CluelessShareGuess[]): string {
  const count = guesses.length;
  if (count <= 1) return "First word. That's rude.";
  if (count <= 5) return 'Followed the heat.';
  const cold = guesses.filter((guess) => {
    const bucket = rankBucket(guess.rank);
    return bucket === 'unranked' || bucket === 'cold';
  }).length;
  if (cold >= 3) return `${cold} cold shots, one clean hit.`;
  if (count <= 14) return 'Found the heat.';
  return 'Took the scenic route.';
}
