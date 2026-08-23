/**
 * Creating the day's post.
 *
 * Two things happen here that the rest of the app depends on:
 *
 * 1. The seed is pinned to the post, so every player who opens it — now or at
 *    midnight — gets the same sequence, which is what makes a comment saying
 *    "I got 14" mean anything.
 * 2. Round 0's two labels are written into `postData`, so the feed view renders
 *    the actual matchup with no network call at all.
 */
import { redis, reddit } from '@devvit/web/server';
import type { SplashData } from '../../shared/api';
import { dailyPostTitle, dailySeed, dayKey, dayLabel } from '../../shared/daily';
import { METRIC_LABEL, POOL } from '../../shared/pool';
import { startRun } from '../../shared/rounds';
import { pinPostDay } from './run';
import { postForDayKey } from './keys';

/**
 * Reddit's Responsible Builder Policy requires automated content to say that it
 * is automated. This is the fallback body on old.reddit, and the splash carries
 * the same line where the app actually renders.
 */
const DISCLOSURE =
  'Posted automatically by the WordKrush app. Open the post to play — one tap per round, ' +
  'same questions for everyone, and your streak lands on the day’s board.';

export type CreateOutcome = { created: boolean; postId: string };

/**
 * Post today's challenge unless it already exists.
 *
 * The cron task and the moderator menu item both land here, and a moderator
 * clicking the menu on a day the cron already fired should not produce a second
 * post that splits the community's board in half.
 */
export async function createDailyPost(now = new Date()): Promise<CreateOutcome> {
  const day = dayKey(now);
  const existing = await redis.get(postForDayKey(day));
  if (existing) {
    return { created: false, postId: existing };
  }

  const seed = dailySeed(now);
  const opening = startRun(POOL, seed);

  const splash: SplashData = {
    v: 1,
    day: dayLabel(now),
    left: opening.state.left.label,
    right: opening.state.right.label,
    metric: METRIC_LABEL,
  };

  const post = await reddit.submitCustomPost({
    title: dailyPostTitle(now),
    entry: 'default',
    postData: { ...splash },
    textFallback: { text: DISCLOSURE },
  });

  await pinPostDay(post.id, { key: day, label: splash.day, seed });
  await redis.set(postForDayKey(day), post.id);

  return { created: true, postId: post.id };
}
