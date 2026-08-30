/**
 * Weekly player email via Resend Broadcasts.
 *
 * Local: npm run email:weekly            (dry-run; prints counts, sends nothing)
 * Send:  npm run email:weekly -- --send
 * CI:    npx tsx pipeline/player-email.ts --send
 *
 * Copy is this week's changelog (player-facing bullets) plus the Monday
 * Wordfall drop, drafted once by OpenRouter. Quiet weeks skip. Auth
 * templates cannot broadcast. Guests have no address.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pipelineDb } from './db';
import { LEVELS } from '../src/data/wordfall/levels';
import {
  draftWithOpenRouter,
  fallbackDraft,
  optionalEnv,
  renderDraftHtml,
  type EmailDraft,
  type OpenRouterEnv,
} from './player-email-draft';
import { PLAY_URL, UNSUBSCRIBE_TOKEN, escapeHtml } from './player-email-html';
import {
  collectWeekNews,
  favoriteGamesByPlayer,
  newsFacts,
  thisWeekWordfall,
  weekHasNews,
  weeklyBroadcastName,
  type WeekNews,
} from './player-email-news';

export { PLAY_URL, UNSUBSCRIBE_TOKEN, escapeHtml };
export { thisWeekWordfall, weeklyBroadcastName };

export const SEGMENT_NAME = 'WordKrush players';
export const DEFAULT_FROM = 'WordKrush <noreply@wordkrush.com>';
export const GAME_PROPERTY_KEY = 'game';

export type EmailMode = 'auto' | 'whats-new' | 'weekly';

export type PlayerEmailPlan = {
  name: string;
  subject: string;
  html: string;
} | null;

export function parseArgs(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): { send: boolean; mode: EmailMode } {
  const modeArg = flagValue(argv, '--mode');
  const mode = parseMode(modeArg ?? env.PLAYER_EMAIL_MODE ?? 'auto');
  const dryRun =
    argv.includes('--dry-run') || env.PLAYER_EMAIL_DRY_RUN === 'true';
  const sendFlag = argv.includes('--send') || env.PLAYER_EMAIL_SEND === 'true';
  return { mode, send: sendFlag && !dryRun };
}

export function parseMode(value: string): EmailMode {
  if (value === 'auto' || value === 'whats-new' || value === 'weekly') return value;
  throw new Error(`Unknown --mode ${value}. Use auto, whats-new, or weekly.`);
}

export function lookbackDays(mode: EmailMode): number {
  return mode === 'whats-new' ? 14 : 7;
}

export function loadChangelog(): string {
  return readFileSync(fileURLToPath(new URL('../docs/CHANGELOG.md', import.meta.url)), 'utf8');
}

export function planPlayerEmail(mode: EmailMode, news: WeekNews, draft: EmailDraft): PlayerEmailPlan {
  if (!weekHasNews(news)) {
    if (mode === 'auto') return null;
    throw new Error('No player-facing news this week — nothing to mail.');
  }
  return {
    name: weeklyBroadcastName(news.weekMonday),
    subject: draft.subject,
    html: renderDraftHtml(draft, news),
  };
}

export async function resolveDraft(
  news: WeekNews,
  options: { send: boolean; fetchImpl?: typeof fetch; env?: OpenRouterEnv },
): Promise<EmailDraft> {
  const env = options.env ?? process.env;
  const key = optionalEnv(env, 'OPENROUTER_API_KEY');
  if (!key) {
    if (options.send) throw new Error('OPENROUTER_API_KEY is missing.');
    return fallbackDraft(news);
  }
  try {
    return await draftWithOpenRouter(news, options.fetchImpl ?? fetch, key, env);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OpenRouter draft failed';
    console.warn(`OpenRouter draft failed (${message}); using the changelog fallback.`);
    return fallbackDraft(news);
  }
}

export function isSkippableRecipient(
  email: string | undefined,
  testPlayerEmail: string | undefined,
): boolean {
  if (!email) return true;
  const lowered = email.toLowerCase();
  if (lowered.endsWith('@invalid.wordkrush')) return true;
  if (testPlayerEmail && lowered === testPlayerEmail.toLowerCase()) return true;
  return false;
}

export function usernameOf(metadata: Record<string, unknown> | undefined): string | undefined {
  const value = metadata?.username ?? metadata?.display_name;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function flagValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

type ResendGroup = { id: string; name: string; kind: 'segment' | 'audience' };

type ResendClient = {
  apiKey: string;
  from: string;
};

type Recipient = {
  email: string;
  playerId: string;
  firstName: string | undefined;
  game: string | undefined;
};

async function resendJson(
  client: ResendClient,
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${client.apiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  let body: Record<string, unknown> = {};
  if (text) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      body = { message: 'Resend returned a non-JSON body' };
    }
  }
  return { status: response.status, body };
}

function resendMessage(body: Record<string, unknown>): string {
  return typeof body.message === 'string' ? body.message : 'Resend request failed';
}

async function ensureGroup(client: ResendClient, configuredId: string | undefined): Promise<ResendGroup> {
  if (configuredId) {
    return { id: configuredId, name: SEGMENT_NAME, kind: 'segment' };
  }
  const listed = await listGroups(client);
  const existing = listed.find((group) => group.name === SEGMENT_NAME);
  if (existing) return existing;

  const created = await resendJson(client, '/segments', {
    method: 'POST',
    body: JSON.stringify({ name: SEGMENT_NAME }),
  });
  if (created.status >= 200 && created.status < 300 && typeof created.body.id === 'string') {
    return { id: created.body.id, name: SEGMENT_NAME, kind: 'segment' };
  }
  const audience = await resendJson(client, '/audiences', {
    method: 'POST',
    body: JSON.stringify({ name: SEGMENT_NAME }),
  });
  if (audience.status >= 200 && audience.status < 300 && typeof audience.body.id === 'string') {
    return { id: audience.body.id, name: SEGMENT_NAME, kind: 'audience' };
  }
  throw new Error(`${resendMessage(created.body)}; ${resendMessage(audience.body)}`);
}

async function listGroups(client: ResendClient): Promise<ResendGroup[]> {
  const segments = await resendJson(client, '/segments');
  if (segments.status >= 200 && segments.status < 300) {
    return readNamedList(segments.body, 'segment');
  }
  const audiences = await resendJson(client, '/audiences');
  if (audiences.status >= 200 && audiences.status < 300) {
    return readNamedList(audiences.body, 'audience');
  }
  return [];
}

function readNamedList(body: Record<string, unknown>, kind: ResendGroup['kind']): ResendGroup[] {
  const rows = Array.isArray(body.data) ? body.data : [];
  const out: ResendGroup[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as { id?: unknown; name?: unknown };
    if (typeof record.id === 'string' && typeof record.name === 'string') {
      out.push({ id: record.id, name: record.name, kind });
    }
  }
  return out;
}

async function ensureGameProperty(client: ResendClient): Promise<void> {
  const listed = await resendJson(client, '/contact-properties');
  const rows = Array.isArray(listed.body.data) ? listed.body.data : [];
  for (const row of rows) {
    if (row && typeof row === 'object' && (row as { key?: unknown }).key === GAME_PROPERTY_KEY) {
      return;
    }
  }
  const created = await resendJson(client, '/contact-properties', {
    method: 'POST',
    body: JSON.stringify({
      key: GAME_PROPERTY_KEY,
      type: 'string',
      fallback_value: 'the games',
    }),
  });
  if (created.status === 409) return;
  if (created.status >= 400) {
    console.warn(`could not create Resend contact property "${GAME_PROPERTY_KEY}": ${resendMessage(created.body)}`);
  }
}

async function broadcastExists(client: ResendClient, name: string): Promise<boolean> {
  let path = '/broadcasts?limit=100';
  for (let page = 0; page < 10; page += 1) {
    const listed = await resendJson(client, path);
    if (listed.status >= 400) throw new Error(resendMessage(listed.body));
    const rows = Array.isArray(listed.body.data) ? listed.body.data : [];
    for (const row of rows) {
      if (row && typeof row === 'object' && (row as { name?: unknown }).name === name) {
        return true;
      }
    }
    const next =
      listed.body.has_more === true && typeof listed.body.next === 'string'
        ? listed.body.next
        : null;
    if (!next) return false;
    path = `/broadcasts?limit=100&after=${encodeURIComponent(next)}`;
  }
  return false;
}

async function upsertContact(client: ResendClient, group: ResendGroup, recipient: Recipient): Promise<void> {
  const payload: Record<string, unknown> = { email: recipient.email };
  if (recipient.firstName) payload.first_name = recipient.firstName;
  if (recipient.game) payload.properties = { [GAME_PROPERTY_KEY]: recipient.game };
  if (group.kind === 'segment') payload.segments = [{ id: group.id }];

  const created = await resendJson(client, group.kind === 'audience' ? `/audiences/${group.id}/contacts` : '/contacts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (created.status >= 200 && created.status < 300) return;
  if (created.status !== 409) throw new Error(resendMessage(created.body));

  const existing = await resendJson(client, `/contacts/${encodeURIComponent(recipient.email)}`);
  const id = typeof existing.body.id === 'string' ? existing.body.id : null;
  if (!id) return;
  const patch: Record<string, unknown> = {};
  if (recipient.firstName) patch.first_name = recipient.firstName;
  if (recipient.game) patch.properties = { [GAME_PROPERTY_KEY]: recipient.game };
  if (Object.keys(patch).length > 0) {
    await resendJson(client, `/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }
  if (group.kind === 'segment') {
    await resendJson(client, `/contacts/${id}/segments/${group.id}`, { method: 'POST' });
  }
}

async function createAndSendBroadcast(
  client: ResendClient,
  group: ResendGroup,
  plan: NonNullable<PlayerEmailPlan>,
): Promise<string> {
  const payload: Record<string, unknown> = {
    from: client.from,
    subject: plan.subject,
    html: plan.html,
    name: plan.name,
    send: true,
  };
  if (group.kind === 'audience') payload.audience_id = group.id;
  else payload.segment_id = group.id;

  const created = await resendJson(client, '/broadcasts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (created.status >= 200 && created.status < 300 && typeof created.body.id === 'string') {
    return created.body.id;
  }
  if (group.kind === 'segment' && /audience/i.test(resendMessage(created.body))) {
    payload.audience_id = group.id;
    delete payload.segment_id;
    const retry = await resendJson(client, '/broadcasts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (retry.status >= 200 && retry.status < 300 && typeof retry.body.id === 'string') {
      return retry.body.id;
    }
    throw new Error(resendMessage(retry.body));
  }
  throw new Error(resendMessage(created.body));
}

async function latestGamesByPlayer(): Promise<Map<string, string>> {
  const admin = pipelineDb();
  const { data, error } = await admin
    .from('global_scores')
    .select('player_id, game_id, played_at')
    .order('played_at', { ascending: false })
    .limit(5000);
  if (error || !data) return new Map();
  const rows: { player_id: string; game_id: string; played_at: string }[] = [];
  for (const row of data) {
    if (
      row &&
      typeof row.player_id === 'string' &&
      typeof row.game_id === 'string' &&
      (typeof row.played_at === 'string' || row.played_at instanceof Date)
    ) {
      rows.push({
        player_id: row.player_id,
        game_id: row.game_id,
        played_at: typeof row.played_at === 'string' ? row.played_at : row.played_at.toISOString(),
      });
    }
  }
  return favoriteGamesByPlayer(rows);
}

async function listRecipientEmails(): Promise<Recipient[]> {
  const admin = pipelineDb();
  const testPlayer = process.env.TEST_PLAYER_EMAIL;
  const games = await latestGamesByPlayer();
  const recipients: Recipient[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    for (const user of data.users) {
      if (!user.email_confirmed_at) continue;
      if (isSkippableRecipient(user.email, testPlayer)) continue;
      recipients.push({
        email: user.email as string,
        playerId: user.id,
        firstName: usernameOf(user.user_metadata as Record<string, unknown> | undefined),
        game: games.get(user.id),
      });
    }
    if (data.users.length < 200) break;
    page += 1;
  }
  return recipients;
}

export async function runPlayerEmail(options: { send: boolean; mode: EmailMode; now?: Date }): Promise<void> {
  const now = options.now ?? new Date();
  const news = collectWeekNews(loadChangelog(), LEVELS, now, lookbackDays(options.mode));
  if (!weekHasNews(news)) {
    if (options.mode === 'auto') {
      console.log('No player-facing changelog or Wordfall drop this week — skipping.');
      return;
    }
    throw new Error('No player-facing news this week — nothing to mail.');
  }

  const draft = await resolveDraft(news, { send: options.send });
  const plan = planPlayerEmail(options.mode, news, draft);
  if (!plan) return;

  if (!options.send) {
    const recipients = await listRecipientEmails();
    console.log(newsFacts(news));
    console.log(
      `dry-run: would send "${plan.subject}" as "${plan.name}" to ${recipients.length} confirmed accounts. Pass --send to create the Resend broadcast.`,
    );
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is missing.');
  const client: ResendClient = {
    apiKey,
    from: process.env.RESEND_FROM?.trim() || DEFAULT_FROM,
  };

  if (await broadcastExists(client, plan.name)) {
    console.log(`already sent "${plan.name}" — skipping.`);
    return;
  }

  const group = await ensureGroup(client, process.env.RESEND_SEGMENT_ID);
  await ensureGameProperty(client);
  const recipients = await listRecipientEmails();
  for (const recipient of recipients) {
    await upsertContact(client, group, recipient);
  }
  const id = await createAndSendBroadcast(client, group, plan);
  console.log(`sent "${plan.name}" to ${recipients.length} synced contacts (broadcast ${id}).`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await runPlayerEmail(options);
}

if (!process.env.VITEST) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Player email failed';
    console.error(message);
    process.exit(1);
  });
}
