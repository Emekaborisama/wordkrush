/**
 * Weekly player email via Resend Broadcasts.
 *
 * Local: npm run email:weekly            (dry-run; prints counts, sends nothing)
 * Send:  npm run email:weekly -- --send
 * CI:    npx tsx pipeline/player-email.ts --send
 *
 * Auth templates cannot broadcast. This syncs confirmed Auth emails into a
 * Resend segment named "WordKrush players" and creates a Broadcast. Resend
 * owns unsubscribe ({{{RESEND_UNSUBSCRIBE_URL}}}). Guests have no address.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pipelineDb } from './db';
import { LEVELS } from '../src/data/wordfall/levels';
import { isNewestRelease } from '../src/games/wordfall/schedule';
import type { Level } from '../src/games/wordfall/types';

export const SEGMENT_NAME = 'WordKrush players';
export const WHATS_NEW_BROADCAST_NAME = 'WordKrush whats-new';
export const DEFAULT_FROM = 'WordKrush <noreply@wordkrush.com>';
export const PLAY_URL =
  'https://wordkrush.com/?utm_source=email&utm_medium=product-update';
export const UNSUBSCRIBE_TOKEN = '{{{RESEND_UNSUBSCRIBE_URL}}}';

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

export function thisWeekWordfall(
  levels: readonly Pick<Level, 'number' | 'name' | 'description' | 'availableFrom'>[],
  now: Date,
): (typeof levels)[number] | null {
  const fresh = levels.filter((level) => isNewestRelease(level, now));
  if (fresh.length === 0) return null;
  return fresh.reduce((best, level) => (level.number > best.number ? level : best));
}

export function weeklyBroadcastName(availableFrom: string): string {
  return `WordKrush weekly ${availableFrom}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderWeeklyHtml(level: Pick<Level, 'name' | 'description' | 'number'>): string {
  const name = escapeHtml(level.name);
  const description = escapeHtml(level.description);
  const href = escapeHtml(
    `${PLAY_URL}&utm_campaign=wordfall-weekly&utm_content=level-${level.number}`,
  );
  return emailShell({
    title: name,
    preview: `${level.name}. Dropped Monday. Play it this week.`,
    eyebrow: 'This week’s Wordfall',
    headline: name,
    intro: `${description} Dropped Monday. You’ve got until Sunday.`,
    ctaHref: href,
    ctaLabel: 'Play Wordfall',
  });
}

export function loadWhatsNewHtml(): string {
  const path = fileURLToPath(new URL('../supabase/templates/whats-new.html', import.meta.url));
  return readFileSync(path, 'utf8');
}

export function planPlayerEmail(
  mode: EmailMode,
  levels: readonly Pick<Level, 'number' | 'name' | 'description' | 'availableFrom'>[],
  now: Date,
  whatsNewHtml: string,
): PlayerEmailPlan {
  const weekly = thisWeekWordfall(levels, now);
  if (mode === 'weekly') {
    if (!weekly || !weekly.availableFrom) {
      throw new Error('No Wordfall drop this week — nothing to mail.');
    }
    return weeklyPlan(weekly);
  }
  if (mode === 'whats-new') {
    return whatsNewPlan(whatsNewHtml);
  }
  if (weekly && weekly.availableFrom) return weeklyPlan(weekly);
  return whatsNewPlan(whatsNewHtml);
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

function weeklyPlan(
  level: Pick<Level, 'name' | 'description' | 'number' | 'availableFrom'>,
): PlayerEmailPlan {
  if (!level.availableFrom) return null;
  return {
    name: weeklyBroadcastName(level.availableFrom),
    subject: `This week’s Wordfall: ${level.name}`,
    html: renderWeeklyHtml(level),
  };
}

function whatsNewPlan(html: string): PlayerEmailPlan {
  return {
    name: WHATS_NEW_BROADCAST_NAME,
    subject: 'The games just got juicier',
    html,
  };
}

function emailShell(parts: {
  title: string;
  preview: string;
  eyebrow: string;
  headline: string;
  intro: string;
  ctaHref: string;
  ctaLabel: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${parts.title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0A0817;">
    <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#0A0817;">
      ${escapeHtml(parts.preview)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0817;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
            <tr>
              <td style="padding:0 8px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.15;font-weight:700;letter-spacing:-0.02em;">
                <span style="color:#FFF9F6;">Word</span><span style="color:#FFB020;">Krush</span>
              </td>
            </tr>
            <tr>
              <td style="background-color:#1A1732;border:1px solid #332D55;border-radius:18px;padding:32px 28px;">
                <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#FFB020;">
                  ${parts.eyebrow}
                </p>
                <h1 style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.25;color:#FFF9F6;">
                  ${parts.headline}
                </h1>
                <p style="margin:0 0 28px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#C5BED8;">
                  ${parts.intro}
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:14px;background-color:#FFB020;">
                      <a href="${parts.ctaHref}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#0A0817;text-decoration:none;">
                        ${escapeHtml(parts.ctaLabel)}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 8px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#87809E;">
                You’re getting this because you have a WordKrush account. <a href="${UNSUBSCRIBE_TOKEN}" style="color:#87809E;">Unsubscribe</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
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

async function upsertContact(
  client: ResendClient,
  group: ResendGroup,
  email: string,
  firstName: string | undefined,
): Promise<void> {
  const payload: Record<string, unknown> = { email };
  if (firstName) payload.first_name = firstName;
  if (group.kind === 'segment') payload.segments = [{ id: group.id }];

  const created = await resendJson(client, group.kind === 'audience' ? `/audiences/${group.id}/contacts` : '/contacts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (created.status >= 200 && created.status < 300) return;
  if (created.status !== 409) throw new Error(resendMessage(created.body));

  const existing = await resendJson(client, `/contacts/${encodeURIComponent(email)}`);
  const id = typeof existing.body.id === 'string' ? existing.body.id : null;
  if (!id) return;
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

async function listRecipientEmails(): Promise<{ email: string; firstName: string | undefined }[]> {
  const admin = pipelineDb();
  const testPlayer = process.env.TEST_PLAYER_EMAIL;
  const recipients: { email: string; firstName: string | undefined }[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    for (const user of data.users) {
      if (!user.email_confirmed_at) continue;
      if (isSkippableRecipient(user.email, testPlayer)) continue;
      recipients.push({
        email: user.email as string,
        firstName: usernameOf(user.user_metadata as Record<string, unknown> | undefined),
      });
    }
    if (data.users.length < 200) break;
    page += 1;
  }
  return recipients;
}

export async function runPlayerEmail(options: { send: boolean; mode: EmailMode; now?: Date }): Promise<void> {
  const plan = planPlayerEmail(options.mode, LEVELS, options.now ?? new Date(), loadWhatsNewHtml());
  if (!plan) {
    console.log('Nothing to send this week.');
    return;
  }

  if (!options.send) {
    const recipients = await listRecipientEmails();
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
  const recipients = await listRecipientEmails();
  for (const recipient of recipients) {
    await upsertContact(client, group, recipient.email, recipient.firstName);
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
