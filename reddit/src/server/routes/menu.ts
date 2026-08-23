/**
 * Moderator menu actions.
 *
 * The subreddit menu is how a moderator posts today's challenge by hand — on
 * install, or on a day the scheduled task did not run.
 */
import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import type { UiResponse } from '@devvit/web/shared';
import { createDailyPost } from '../core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const outcome = await createDailyPost();
    const url = `https://reddit.com/r/${context.subredditName}/comments/${outcome.postId.replace('t3_', '')}`;

    if (!outcome.created) {
      return c.json<UiResponse>(
        { showToast: 'Today’s More or Less is already posted.', navigateTo: url },
        200,
      );
    }
    return c.json<UiResponse>({ navigateTo: url }, 200);
  } catch (error) {
    console.error('Failed to create the daily post:', error);
    return c.json<UiResponse>({ showToast: 'Could not create the post.' }, 400);
  }
});
