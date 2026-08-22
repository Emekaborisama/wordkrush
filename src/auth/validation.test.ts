import { describe, expect, it } from 'vitest';
import {
  friendlyAuthError,
  normalizeUsername,
  validateEmail,
  validatePassword,
  validateUsername,
} from './validation';

describe('validateUsername', () => {
  it('accepts ordinary names', () => {
    for (const n of ['emeka', 'Boris_99', 'more or less', 'jean-luc', 'Zoë']) {
      expect(validateUsername(n), n).toBeNull();
    }
  });

  it('enforces length bounds', () => {
    expect(validateUsername('ab')).toMatch(/at least/i);
    expect(validateUsername('x'.repeat(25))).toMatch(/at most/i);
    expect(validateUsername('')).toMatch(/pick a username/i);
    expect(validateUsername('   ')).toMatch(/pick a username/i);
  });

  it('rejects markup and control characters', () => {
    // A leaderboard renders these next to other players' names.
    expect(validateUsername('<script>x</script>')).toBeTruthy();
    expect(validateUsername('bob‮reversed')).toBeTruthy(); // RTL override spoofing
    expect(validateUsername('drop;table')).toBeTruthy();
  });

  it('trims surrounding whitespace rather than rejecting it', () => {
    // People paste names with stray spaces; failing them would be hostile.
    expect(validateUsername('  bob  ')).toBeNull();
  });

  it('rejects leading or trailing separator characters', () => {
    // Unlike spaces these are not trimmed, and they read as padding used to
    // sort to the top of a list or to mimic another player's name.
    expect(validateUsername('bob_')).toBeTruthy();
    expect(validateUsername('-bob')).toBeTruthy();
  });
});

describe('validateEmail', () => {
  it('accepts normal addresses', () => {
    for (const e of ['a@b.co', 'first.last+tag@sub.domain.org']) {
      expect(validateEmail(e), e).toBeNull();
    }
  });

  it('rejects obvious non-addresses', () => {
    for (const e of ['', 'nope', 'a@b', 'a b@c.com', '@b.co']) {
      expect(validateEmail(e), e).toBeTruthy();
    }
  });
});

describe('validatePassword', () => {
  it('requires a minimum length', () => {
    expect(validatePassword('short')).toMatch(/at least/i);
    expect(validatePassword('')).toMatch(/enter a password/i);
    expect(validatePassword('longenough1')).toBeNull();
  });

  it('does not impose composition rules', () => {
    // Length beats forced symbols; arbitrary composition rules push people
    // toward weaker, more predictable passwords.
    expect(validatePassword('correct horse battery staple')).toBeNull();
  });
});

describe('normalizeUsername', () => {
  it('trims and collapses internal whitespace', () => {
    expect(normalizeUsername('  more   or  less ')).toBe('more or less');
  });
});

describe('friendlyAuthError', () => {
  it('translates known Supabase errors', () => {
    expect(friendlyAuthError('Invalid login credentials')).toMatch(/wrong email or password/i);
    expect(friendlyAuthError('User already registered')).toMatch(/already has an account/i);
    expect(friendlyAuthError('Email not confirmed')).toMatch(/confirm your email/i);
    expect(friendlyAuthError('Request rate limit reached')).toMatch(/too many attempts/i);
  });

  it('falls back without leaking internals, and reassures about local scores', () => {
    const msg = friendlyAuthError('PGRST301: jwt expired at layer 7 of gateway');
    expect(msg).not.toMatch(/PGRST|jwt|gateway/i);
    expect(msg).toMatch(/saved on this device/i);
  });
});
