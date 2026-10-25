/**
 * Spoiler-free More or Less result paste.
 *
 * A wall of green for every correct call, closed by the red that ended the
 * run. Never the item labels or values — GameOverScreen shows the losing
 * pair on screen; a public paste must not.
 */
import { SHARE_MAX_SQUARES, composeShare, wrapSquares } from '../share';
import { buildShareUrl, type MoreOrLessShareData } from '../share-data';
import { pickCardPhotos } from './card-photos';
import type { ChallengeRun } from './challenge';
import { DAILY_PAIRS } from './daily';

const CORRECT = '🟩';
const WRONG = '🟥';

export type MoreOrLessShareInput = {
  streak: number;
  bestStreak: number;
  rank?: number;
  /** The run's seed and level: the link becomes a challenge to replay it. */
  challenge?: ChallengeRun;
};

export function buildShareText(input: MoreOrLessShareInput): string {
  const shareData: MoreOrLessShareData = {
    game: 'more-or-less',
    streak: input.streak,
    bestStreak: input.bestStreak,
  };

  // The card the link unfurls to is two photographs, and naming them here is
  // what pins one share to one board. They are decoration, seeded by the
  // standing rather than drawn from the run: the pair that ended it is a
  // spoiler, and this link is public.
  const photos = pickCardPhotos(`${input.streak}:${input.bestStreak}`);
  if (photos) shareData.photos = photos;
  if (input.challenge) shareData.challenge = input.challenge;

  return composeShare({
    title: 'WordKrush · Higher or Lower',
    grid: moreOrLessGrid(input.streak),
    standing: moreOrLessStanding(input),
    verdict: input.challenge ? 'Can you beat it? Same pairs, same order.' : moreOrLessVerdict(input.streak),
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

/**
 * The Daily 10 paste: the day's number, a green square per right call (red
 * where it ended, none if all ten held), and the score out of ten. Spoiler
 * free like the rest; the link lands on the game, where today's daily waits.
 */
export function buildDailyShareText({ number, streak, bestStreak }: { number: number; streak: number; bestStreak: number }): string {
  const perfect = streak >= DAILY_PAIRS;
  const shareData: MoreOrLessShareData = { game: 'more-or-less', streak, bestStreak };
  const photos = pickCardPhotos(`daily:${number}`);
  if (photos) shareData.photos = photos;
  return composeShare({
    title: `WordKrush Daily #${number}`,
    grid: wrapSquares(CORRECT.repeat(Math.min(streak, DAILY_PAIRS)) + (perfect ? '' : WRONG)),
    standing: `${Math.min(streak, DAILY_PAIRS)}/${DAILY_PAIRS}`,
    verdict: perfect ? 'A perfect ten. Your turn.' : 'Same ten pairs for everyone today. Your turn.',
    url: buildShareUrl(shareData),
  });
}
