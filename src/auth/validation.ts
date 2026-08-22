/**
 * Pure input validation for the auth forms. Kept separate from any network or
 * React code so it can be unit tested in milliseconds — and so the rules are
 * stated in exactly one place rather than scattered through the UI.
 *
 * These checks are for FEEDBACK, not security. The real constraints live in
 * the database (CHECK on display_name) and in Supabase Auth. A client-side
 * check can always be bypassed; it exists so a player learns about a problem
 * before a round-trip, not to protect anything.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
export const PASSWORD_MIN = 8;

export type FieldError = string | null;

export function validateUsername(raw: string): FieldError {
  const value = raw.trim();
  if (value.length === 0) return 'Pick a username';
  if (value.length < USERNAME_MIN) return `At least ${USERNAME_MIN} characters`;
  if (value.length > USERNAME_MAX) return `At most ${USERNAME_MAX} characters`;
  // Letters, numbers, underscore, hyphen, space. Rejecting the rest keeps
  // leaderboard names from carrying markup, control characters, or
  // right-to-left overrides used to spoof other players' names.
  if (!/^[\p{L}\p{N} _-]+$/u.test(value)) return 'Letters, numbers, spaces, - and _ only';
  if (/^[ _-]|[ _-]$/.test(value)) return 'Cannot start or end with a space, - or _';
  return null;
}

export function validateEmail(raw: string): FieldError {
  const value = raw.trim();
  if (value.length === 0) return 'Enter your email';
  // Deliberately permissive: the only authoritative test of an email address
  // is sending mail to it. Over-strict regexes reject valid addresses.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'That does not look like an email';
  return null;
}

export function validatePassword(raw: string): FieldError {
  if (raw.length === 0) return 'Enter a password';
  if (raw.length < PASSWORD_MIN) return `At least ${PASSWORD_MIN} characters`;
  return null;
}

/** Normalised form of a username, for display and storage. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * Turns a Supabase auth error into something a player can act on.
 * Raw messages leak implementation detail and read as hostile.
 */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Wrong email or password.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'That email already has an account. Try signing in.';
  if (m.includes('email not confirmed')) return 'Check your inbox to confirm your email first.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts. Wait a moment and try again.';
  if (m.includes('password')) return 'That password is not accepted. Try a longer one.';
  if (m.includes('network') || m.includes('fetch')) return 'No connection. Your scores stay saved on this device.';
  return 'Something went wrong. Your scores are still saved on this device.';
}
