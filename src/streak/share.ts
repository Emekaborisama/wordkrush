/**
 * The daily streak as a share: the card with the cat, the flame and the
 * count, its link, and one line asking the reader to keep up.
 */
import type { SharePayload } from '../games/share';
import { buildShareImageUrl, buildShareUrl, shareFileName, type StreakShareData } from '../games/share-data';

export type StreakShareInput = {
  /** Live days, from `liveStreakDays`. */
  days: number;
  /** Longest streak so far. */
  best: number;
};

export function buildStreakSharePayload({ days, best }: StreakShareInput): SharePayload {
  // A best below the streak being shared is never claimed.
  const data: StreakShareData = { game: 'streak', days, best: Math.max(days, best) };
  return {
    caption: days === 1 ? 'Day one of my WordKrush streak. Keep up with me?' : `${days} days in a row on WordKrush. Can you keep up?`,
    url: buildShareUrl(data),
    imageUrl: buildShareImageUrl(data),
    fileName: shareFileName('streak'),
  };
}
