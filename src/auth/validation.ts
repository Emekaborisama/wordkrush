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
export const OTP_CODE_MIN = 6;
export const OTP_CODE_MAX = 8;

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

export function validatePhone(raw: string): FieldError {
  const value = raw.trim();
  if (value.length === 0) return 'Enter your phone number';
  if (!value.startsWith('+')) return 'Start with + and your country code';
  const normalized = normalizePhone(value);
  // E.164: + then 7–15 digits, first digit not zero.
  if (!/^\+[1-9]\d{6,14}$/.test(normalized)) return 'That does not look like a phone number';
  return null;
}

export function validateOtpCode(raw: string): FieldError {
  const value = raw.trim();
  if (value.length === 0) return 'Enter the code we sent';
  if (!/^\d+$/.test(value)) return 'Use the number code we sent';
  if (value.length < OTP_CODE_MIN || value.length > OTP_CODE_MAX) {
    return `The code is ${OTP_CODE_MIN} to ${OTP_CODE_MAX} digits`;
  }
  return null;
}

/** Normalised form of a username, for display and storage. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/** E.164-ish: keep a leading + and digits only. */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^\d]/g, '');
  if (trimmed.startsWith('+')) return `+${digits}`;
  return digits;
}

/**
 * Turns a Supabase auth error into something a player can act on.
 * Raw messages leak implementation detail and read as hostile.
 */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('signups not allowed') || m.includes('user not found')) {
    return 'No account for those details. Create one first.';
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'That email or number already has an account. Try signing in.';
  }
  if (m.includes('invalid') && m.includes('phone')) {
    return 'That phone number is not accepted.';
  }
  if (
    m.includes('sms') &&
    (m.includes('provider') || m.includes('twilio') || m.includes('error sending'))
  ) {
    return 'Could not send a text. Try email instead.';
  }
  if (
    (m.includes('otp') || m.includes('token') || m.includes('code') || m.includes('magic')) &&
    (m.includes('invalid') || m.includes('expired') || m.includes('denied'))
  ) {
    return 'That code or link is wrong or has expired. Request a new one.';
  }
  if (m.includes('email not confirmed')) return 'Check your inbox and tap the link we sent.';
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts. Wait a moment and try again.';
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'No connection. Your scores stay saved on this device.';
  }
  return 'Something went wrong. Your scores are still saved on this device.';
}
