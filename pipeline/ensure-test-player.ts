/**
 * Creates or refreshes the local AI test player in Supabase Auth and writes
 * TEST_PLAYER_* names into `.env`. Values are never printed.
 *
 * This is a confirmed ordinary player, not a service-role substitute.
 * Runtime play still uses magic link / SMS (D-033, D-034). The password exists
 * so agents can sign in from Node without waiting on email.
 *
 * Run: npm run auth:ensure-test-player
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { pipelineDb } from './db';

const ENV_PATH = resolve(process.cwd(), '.env');
const DEFAULT_EMAIL = 'ai-tester@invalid.wordkrush';
const DEFAULT_USERNAME = 'AI-Tester';

async function main() {
  const admin = pipelineDb();
  const email = envValue('TEST_PLAYER_EMAIL') || DEFAULT_EMAIL;
  const username = envValue('TEST_PLAYER_USERNAME') || DEFAULT_USERNAME;
  const password = envValue('TEST_PLAYER_PASSWORD') || randomBytes(24).toString('base64url');

  const user = await ensureAuthUser(admin, email, password, username);
  const { error: profileError } = await admin
    .from('players')
    .upsert({ id: user.id, display_name: username });
  if (profileError) {
    console.warn(
      'Auth user is ready, but the players row could not be written. Apply the leaderboard migration if it is missing.',
    );
  }

  writeEnvKeys({
    TEST_PLAYER_EMAIL: email,
    TEST_PLAYER_PASSWORD: password,
    TEST_PLAYER_USERNAME: username,
  });

  const publishable = envValue('SUPABASE_PUBLISHABLE_KEY') || envValue('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  const url = envValue('SUPABASE_URL') || envValue('EXPO_PUBLIC_SUPABASE_URL');
  if (!url || !publishable) {
    throw new Error('SUPABASE_URL and a publishable key must be set to verify the test player.');
  }

  const app = createClient(url, publishable, { auth: { persistSession: false } });
  const { error: signInError } = await app.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(
      `Test player exists but password sign-in failed (${signInError.message}). The Email provider must still allow passwords for this local account.`,
    );
  }
  await app.auth.signOut();

  console.log(
    'Test player is ready. Credentials are in .env as TEST_PLAYER_EMAIL, TEST_PLAYER_PASSWORD, and TEST_PLAYER_USERNAME. Values were not printed.',
  );
}

async function ensureAuthUser(
  admin: ReturnType<typeof pipelineDb>,
  email: string,
  password: string,
  username: string,
) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (!error && data.user) return data.user;

  const duplicate =
    error &&
    (error.message.toLowerCase().includes('already') ||
      error.message.toLowerCase().includes('registered') ||
      error.message.toLowerCase().includes('exists'));
  if (!duplicate) {
    throw new Error(error?.message ?? 'Could not create the test player.');
  }

  const existing = await findUserByEmail(admin, email);
  if (!existing) {
    throw new Error('A test player with that email already exists, but it could not be loaded.');
  }
  const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(
    existing.id,
    { password, email_confirm: true, user_metadata: { username } },
  );
  if (updateError || !updated.user) {
    throw new Error(updateError?.message ?? 'Could not update the test player.');
  }
  return updated.user;
}

async function findUserByEmail(admin: ReturnType<typeof pipelineDb>, email: string) {
  const wanted = email.toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const match = data.users.find((user) => user.email?.toLowerCase() === wanted);
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

function envValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function writeEnvKeys(values: Record<string, string>) {
  if (!existsSync(ENV_PATH)) {
    throw new Error('.env is missing. Copy .env.example to .env first.');
  }
  let text = readFileSync(ENV_PATH, 'utf8');
  if (!text.includes('TEST_PLAYER_EMAIL=')) {
    text = `${text.trimEnd()}\n\n# Local AI test player. Never EXPO_PUBLIC_. Not a service-role substitute.\n`;
  }
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    text = pattern.test(text) ? text.replace(pattern, line) : `${text.trimEnd()}\n${line}\n`;
  }
  writeFileSync(ENV_PATH, text.endsWith('\n') ? text : `${text}\n`);
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : 'Could not ensure the test player.');
  process.exit(1);
});
