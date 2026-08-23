/**
 * The daily drop.
 *
 * Wired to a cron schedule in `devvit.json`. This is the whole content
 * calendar: the Wikipedia snapshot is refreshed weekly by the pipeline in the
 * parent repo (D-036), and each day's post picks a different sequence out of it
 * from a date-derived seed. Nobody has to decide what to post.
 *
 * `createDailyPost` is idempotent per calendar day, so a retried task cannot
 * split the community's board across two posts.
 */
import { Hono } from 'hono';
import { createDailyPost } from '../core/post';

export const cron = new Hono();

cron.post('/daily-post', async (c) => {
  try {
    const outcome = await createDailyPost();
    if (!outcome.created) {
      console.log(`Daily post already exists for today (${outcome.postId}); nothing to do.`);
    } else {
      console.log(`Posted today's More or Less: ${outcome.postId}`);
    }
    return c.json({ status: 'ok', postId: outcome.postId, created: outcome.created });
  } catch (error) {
    console.error('Daily post task failed:', error);
    return c.json({ status: 'error' }, 500);
  }
});
