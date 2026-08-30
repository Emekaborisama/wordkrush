/**
 * Spoiler-free More or Less result paste.
 *
 * A wall of green for every correct call, closed by the red that ended the
 * run. Never the item labels or values — GameOverScreen shows the losing
 * pair on screen; a public paste must not.
 */
import { SHARE_MAX_SQUARES, composeShare, wrapSquares } from '../share';
import { buildShareUrl, type MoreOrLessShareData } from '../share-data';

const CORRECT = '🟩';
const WRONG = '🟥';

export type MoreOrLessShareInput = {
  streak: number;
  bestStreak: number;
  rank?: number;
};

export function buildShareText(input: MoreOrLessShareInput): string {
  const shareData: MoreOrLessShareData = {
    game: 'more-or-less',
    streak: input.streak,
    bestStreak: input.bestStreak,
  };

  return composeShare({
    title: 'WordKrush · More or Less',
    grid: moreOrLessGrid(input.streak),
    standing: moreOrLessStanding(input),
    verdict: moreOrLessVerdict(input.streak),
    url: buildShareUrl(shareData),
  });
}

function moreOrLessGrid(streak: number): string {
  const correct = Math.max(0, streak);
  if (correct <= SHARE_MAX_SQUARES) {
    return wrapSquares(CORRECT.repeat(correct) + WRONG);
  }
  return wrapSquares(CORRECT.repeat(correct), (extra) => `+${extra} more ${WRONG}`);
}

function moreOrLessStanding({ streak, bestStreak, rank }: MoreOrLessShareInput): string {
  const parts = [`Streak ${streak}`];
  if (bestStreak > 0) parts.push(`best ${bestStreak}`);
  if (rank !== undefined) parts.push(`#${rank}`);
  return parts.join(' · ');
}

function moreOrLessVerdict(streak: number): string {
  if (streak <= 0) return 'Gone in one.';
  if (streak < 5) return 'A start. Then one miss.';
  if (streak < 20) return 'Held the line, then blinked.';
  return 'A long wall. Then one brick.';
}
