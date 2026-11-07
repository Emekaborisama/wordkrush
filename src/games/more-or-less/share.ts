/**
 * A Higher or Lower share: the board card, its link, and one line daring the
 * reader to beat the streak.
 *
 * Never the item labels or values. GameOverScreen shows the losing pair on
 * screen; a public share must not, and the card draws two unrelated photos.
 */
import type { SharePayload } from '../share';
import { buildShareImageUrl, buildShareUrl, shareFileName, type MoreOrLessShareData } from '../share-data';
import { pickCardPhotos } from './card-photos';
import type { ChallengeRun } from './challenge';
import { DAILY_PAIRS } from './daily';

export type MoreOrLessShareInput = {
  streak: number;
  bestStreak: number;
  /** The run's seed and level: the link becomes a challenge to replay it. */
  challenge?: ChallengeRun;
};

function payload(data: MoreOrLessShareData, caption: string): SharePayload {
  return {
    caption,
    url: buildShareUrl(data),
    imageUrl: buildShareImageUrl(data),
    fileName: shareFileName('higher-or-lower'),
  };
}

export function buildSharePayload(input: MoreOrLessShareInput): SharePayload {
  const data: MoreOrLessShareData = {
    game: 'more-or-less',
    streak: input.streak,
    bestStreak: input.bestStreak,
  };

  // The card is two photographs, and naming them here is what pins one share
  // to one board. They are decoration, seeded by the standing rather than
  // drawn from the run: the pair that ended it is a spoiler, and this link is
  // public.
  const photos = pickCardPhotos(`${input.streak}:${input.bestStreak}`);
  if (photos) data.photos = photos;
  if (input.challenge) data.challenge = input.challenge;

  return payload(data, moreOrLessCaption(input));
}

function moreOrLessCaption({ streak, challenge }: MoreOrLessShareInput): string {
  if (challenge) return `Beat my streak of ${streak} on Higher or Lower. Same pairs, same order.`;
  if (streak <= 0) return 'Higher or Lower got me on the first pair. Can you do better?';
  return `I called ${streak} in a row on Higher or Lower. Can you beat it?`;
}

/**
 * The Daily 10 share: today's number and the score out of ten. The link
 * lands on the game, where today's ten wait.
 */
export function buildDailySharePayload({ number, streak, bestStreak }: { number: number; streak: number; bestStreak: number }): SharePayload {
  const score = Math.min(streak, DAILY_PAIRS);
  const data: MoreOrLessShareData = { game: 'more-or-less', streak, bestStreak };
  const photos = pickCardPhotos(`daily:${number}`);
  if (photos) data.photos = photos;
  const caption =
    score >= DAILY_PAIRS
      ? `A perfect ${DAILY_PAIRS}/${DAILY_PAIRS} on WordKrush Daily #${number}. Your turn.`
      : `${score}/${DAILY_PAIRS} on WordKrush Daily #${number}. Same ten pairs for everyone today.`;
  return payload(data, caption);
}
