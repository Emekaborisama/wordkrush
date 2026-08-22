/**
 * Auth operations. Every function degrades safely when the backend is absent
 * or unreachable — signing in is an enhancement, never a gate on playing.
 */
import { supabase } from './client';
import { friendlyAuthError, normalizeUsername } from './validation';

export type Profile = { id: string; username: string; email: string | null };
export type AuthResult = { ok: true; profile: Profile } | { ok: false; error: string };

/** Reads the current session, if any. Null means "playing signed out", not an error. */
export async function currentProfile(): Promise<Profile | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    // Prefer the players row; fall back to auth metadata if the profile row
    // has not been created yet (e.g. signup succeeded but the insert failed).
    const { data: row } = await supabase
      .from('players')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    return {
      id: user.id,
      username: row?.display_name ?? (user.user_metadata?.username as string) ?? 'Player',
      email: user.email ?? null,
    };
  } catch {
    return null;
  }
}

export async function signUp(email: string, password: string, username: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Online play is not configured in this build.' };
  const name = normalizeUsername(username);
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // Stored on the auth user so the username survives even if the players
      // insert below fails (e.g. offline right after signup).
      options: { data: { username: name } },
    });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    const user = data.user;
    if (!user) return { ok: false, error: 'Check your inbox to confirm your email, then sign in.' };

    // RLS requires auth.uid() = id, so this only works as the signed-in user.
    const { error: profileError } = await supabase
      .from('players')
      .upsert({ id: user.id, display_name: name });
    if (profileError) {
      // Not fatal: the account exists and the username is in user_metadata.
      console.warn('players upsert failed:', profileError.message);
    }
    return { ok: true, profile: { id: user.id, username: name, email: user.email ?? null } };
  } catch (err) {
    return { ok: false, error: friendlyAuthError((err as Error).message) };
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Online play is not configured in this build.' };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    const profile = await currentProfile();
    if (!profile) return { ok: false, error: 'Signed in, but could not load your profile.' };
    return { ok: true, profile };
  } catch (err) {
    return { ok: false, error: friendlyAuthError((err as Error).message) };
  }
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
  if (!supabase) return { ok: false, error: 'Online play is not configured in this build.' };
  const name = normalizeUsername(username);
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return { ok: false, error: 'You are not signed in.' };
    const { error } = await supabase.from('players').upsert({ id: user.id, display_name: name });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    return { ok: true, profile: { id: user.id, username: name, email: user.email ?? null } };
  } catch (err) {
    return { ok: false, error: friendlyAuthError((err as Error).message) };
  }
}
