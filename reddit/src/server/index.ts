/**
 * The Devvit server: a Hono app on Reddit's serverless runtime.
 *
 * `/api/*` is what the web view calls. `/internal/*` is what Reddit itself
 * calls — menu items, scheduled tasks and triggers — and every one of those
 * paths must also be declared in `devvit.json` or it is never routed.
 */
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { api } from './routes/api';
import { cron } from './routes/cron';
import { menu } from './routes/menu';
import { triggers } from './routes/triggers';

const app = new Hono();
const internal = new Hono();

internal.route('/menu', menu);
internal.route('/cron', cron);
internal.route('/triggers', triggers);

app.route('/api', api);
app.route('/internal', internal);

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
