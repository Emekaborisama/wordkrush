/**
 * Auth operations. Every function degrades safely when the backend is absent
 * or unreachable — signing in is an enhancement, never a gate on playing.
 *
 * Accounts use Supabase Auth (D-033, D-037): email magic link only. One unique
 * leaderboard username per account. No passwords, no phone identity.
 * The 6-digit code from the same email can complete sign-in when a deep link
 * cannot open the app.
 */
import type { User } from '@supabase/supabase-js';
import { isAuthCallbackUrl, parseAuthCallbackUrl } from './callback';
import { supabase } from './client';
import {
  friendlyAuthError,
  normalizeUsername,
  USERNAME_TAKEN_MESSAGE,
  validateUsername,
} from './validation';

export type Profile = { id: string; username: string; email: string | null };
export type AuthResult = { ok: true; profile: Profile } | { ok: false; error: string };
export type MagicLinkResult = { ok: true } | { ok: false; error: string };

const UNCONFIGURED = 'Online play is not configured in this build.';

/** Reads the current session, if any. Null means "playing signed out", not an error. */
export async function currentProfile(): Promise<Profile | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    return profileFromUser(user);
  } catch {
    return null;
  }
}

export async function requestMagicLink(input: {
  email: string;
  redirectTo: string;
  createUser: boolean;
  username?: string;
}): Promise<MagicLinkResult> {
  if (!supabase) return { ok: false, error: UNCONFIGURED };
  try {
    if (input.createUser) {
      const usernameError = validateUsername(input.username ?? '');
      if (usernameError) return { ok: false, error: usernameError };
      if (await usernameTaken(input.username ?? '')) {
        return { ok: false, error: USERNAME_TAKEN_MESSAGE };
      }
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: input.email.trim(),
      options: {
        emailRedirectTo: input.redirectTo,
        shouldCreateUser: input.createUser,
        ...(input.username
          ? { data: { username: normalizeUsername(input.username) } }
          : {}),
      },
    });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: friendlyAuthError((err as Error).message) };
  }
}

export async function verifyEmailOtp(email: string, token: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: UNCONFIGURED };
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email',
    });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    const user = data.user ?? data.session?.user;
    if (!user) return { ok: false, error: 'Signed in, but could not load your profile.' };
    const profile = await profileFromUser(user);
    await persistDisplayName(profile);
    return { ok: true, profile };
  } catch (err) {
    return { ok: false, error: friendlyAuthError((err as Error).message) };
  }
}

/**
 * Completes a native magic-link redirect. Web lets the Supabase client parse
 * the URL (`detectSessionInUrl`); calling exchange there would consume the
 * code twice.
 */
export async function completeSessionFromUrl(url: string): Promise<Profile | null> {
  if (!supabase || !isAuthCallbackUrl(url)) return null;
  if (typeof document !== 'undefined') return currentProfile();
  const params = parseAuthCallbackUrl(url);
  try {
    if (params.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) return null;
    } else if (params.accessToken && params.refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
      });
      if (error) return null;
    } else {
      return null;
    }
    const profile = await currentProfile();
    if (profile) await persistDisplayName(profile);
    return profile;
  } catch {
    return null;
  }
}

/**
 * Session changes, including magic-link completion on any screen.
 * Builds the profile from the callback's user so we never call getSession
 * inside the listener (that pairing can deadlock in supabase-js).
 */
export function subscribeToAuth(onChange: (profile: Profile | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (!session?.user) {
      onChange(null);
      return;
    }
    void (async () => {
      const profile = await profileFromUser(session.user);
      if (event === 'SIGNED_IN') await persistDisplayName(profile);
      onChange(profile);
    })();
  });
  return () => data.subscription.unsubscribe();
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    /* ignore — worst case the session expires on its own */
  }
}

export async function updateUsername(username: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: UNCONFIGURED };
  const name = normalizeUsername(username);
  const usernameError = validateUsername(name);
  if (usernameError) return { ok: false, error: usernameError };
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return { ok: false, error: 'You are not signed in.' };
    if (await usernameTaken(name, user.id)) {
      return { ok: false, error: USERNAME_TAKEN_MESSAGE };
    }
    const { error } = await supabase.from('players').upsert({ id: user.id, display_name: name });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    return { ok: true, profile: { id: user.id, username: name, email: user.email ?? null } };
  } catch (err) {
    return { ok: false, error: friendlyAuthError((err as Error).message) };
  }
}

async function profileFromUser(user: User): Promise<Profile> {
  const fallback =
    (typeof user.user_metadata?.username === 'string' && user.user_metadata.username) ||
    'Player';
  if (!supabase) {
    return { id: user.id, username: fallback, email: user.email ?? null };
  }
  try {
    const { data: row } = await supabase
      .from('players')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    return {
      id: user.id,
      username: row?.display_name ?? fallback,
      email: user.email ?? null,
    };
  } catch {
    return { id: user.id, username: fallback, email: user.email ?? null };
  }
}

async function persistDisplayName(profile: Profile): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('players')
    .upsert({ id: profile.id, display_name: profile.username });
  if (error) {
    console.warn('players upsert failed:', error.message);
  }
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * True when another player already claims this name. False if the backend
 * cannot answer — the unique index is then the backstop on persist.
 */
async function usernameTaken(raw: string, exceptId?: string): Promise<boolean> {
  if (!supabase) return false;
  const name = normalizeUsername(raw);
  const { data, error } = await supabase.rpc('username_taken', {
    raw: name,
    ...(exceptId ? { except_id: exceptId } : {}),
  });
  if (!error && typeof data === 'boolean') return data;

  let query = supabase
    .from('players')
    .select('id')
    .ilike('display_name', escapeIlike(name))
    .limit(1);
  if (exceptId) query = query.neq('id', exceptId);
  const { data: rows, error: selectError } = await query;
  if (selectError) return false;
  return (rows?.length ?? 0) > 0;
}
