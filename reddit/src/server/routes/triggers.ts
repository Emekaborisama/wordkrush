/**
 * Install-time setup.
 *
 * A moderator who installs the app should see the game working immediately
 * rather than waiting until the next cron fire, so installation posts the
 * current day's challenge straight away.
 */
import { Hono } from 'hono';
import { createDailyPost } from '../core/post';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    const outcome = await createDailyPost();
    console.log(
      outcome.created
        ? `Installed; posted today's More or Less: ${outcome.postId}`
        : `Installed; today's post already exists: ${outcome.postId}`,
    );
  } catch (error) {
    // An install that cannot post is still a working install — the moderator
    // menu item and tomorrow's cron both still work.
    console.error('Could not post on install:', error);
  }
  return c.json({ status: 'ok' });
});
