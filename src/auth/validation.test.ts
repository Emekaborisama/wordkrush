import { describe, expect, it } from 'vitest';
import {
  friendlyAuthError,
  normalizePhone,
  normalizeUsername,
  validateEmail,
  validateOtpCode,
  validatePhone,
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

describe('validateOtpCode', () => {
  it('accepts 6 to 8 digit codes', () => {
    expect(validateOtpCode('123456')).toBeNull();
    expect(validateOtpCode('12345678')).toBeNull();
  });

  it('rejects empty, short, long, and non-numeric values', () => {
    expect(validateOtpCode('')).toMatch(/enter the code/i);
    expect(validateOtpCode('12345')).toMatch(/6 to 8/i);
    expect(validateOtpCode('123456789')).toMatch(/6 to 8/i);
    expect(validateOtpCode('12ab56')).toMatch(/number code/i);
  });
});

describe('validatePhone', () => {
  it('accepts E.164 numbers, including spaced input', () => {
    expect(validatePhone('+447700900123')).toBeNull();
    expect(validatePhone('+1 555 123 4567')).toBeNull();
  });

  it('requires a country code and rejects obvious non-numbers', () => {
    expect(validatePhone('')).toMatch(/enter your phone/i);
    expect(validatePhone('07700900123')).toMatch(/country code/i);
    expect(validatePhone('+12')).toMatch(/phone number/i);
    expect(validatePhone('+0447700900123')).toMatch(/phone number/i);
  });
});

describe('normalizePhone', () => {
  it('keeps a leading plus and strips separators', () => {
    expect(normalizePhone('+44 7700-900123')).toBe('+447700900123');
  });
});

describe('normalizeUsername', () => {
  it('trims and collapses internal whitespace', () => {
    expect(normalizeUsername('  more   or  less ')).toBe('more or less');
  });
});

describe('friendlyAuthError', () => {
  it('translates known Supabase errors', () => {
    expect(friendlyAuthError('Signups not allowed for otp')).toMatch(/create one first/i);
    expect(friendlyAuthError('User already registered')).toMatch(/already has an account/i);
    expect(friendlyAuthError('Invalid phone number format')).toMatch(/phone number is not accepted/i);
    expect(friendlyAuthError('Token has expired or is invalid')).toMatch(/expired/i);
    expect(friendlyAuthError('Email not confirmed')).toMatch(/tap the link/i);
    expect(friendlyAuthError('Request rate limit reached')).toMatch(/too many attempts/i);
  });

  it('falls back without leaking internals, and reassures about local scores', () => {
    const msg = friendlyAuthError('PGRST301: jwt expired at layer 7 of gateway');
    expect(msg).not.toMatch(/PGRST|jwt|gateway/i);
    expect(msg).toMatch(/saved on this device/i);
  });
});
