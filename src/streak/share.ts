/**
 * The daily streak as a paste: the flame, the days, and a link whose card is
 * the cat cheering beside the count (`server/og-image.mjs`). Nothing in it
 * is about a game's answers, so it is spoiler-free by construction.
 */
import { composeShare, type ShareBlocks } from '../games/share';
import { buildShareUrl, type StreakShareData } from '../games/share-data';

export type StreakShareInput = {
  /** Live days, from `liveStreakDays`. */
  days: number;
  /** Longest streak so far. */
  best: number;
};

export function streakShareBlocks({ days, best }: StreakShareInput): ShareBlocks {
  const longest = Math.max(days, best);
  const data: StreakShareData = { game: 'streak', days, best: longest };
  return {
    title: `WordKrush 🔥 ${days}-day streak`,
    grid: '',
    standing: longest > days ? `Best ${longest}` : days > 1 ? 'My longest yet' : 'Day one',
    verdict: 'One word game a day. Keep up with me?',
    url: buildShareUrl(data),
  };
}

export function buildStreakShareText(input: StreakShareInput): string {
  return composeShare(streakShareBlocks(input));
}
