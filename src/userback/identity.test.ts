import { describe, expect, it } from 'vitest';
import { sameUserbackIdentity, toUserbackIdentity } from './identity';

describe('toUserbackIdentity', () => {
  it('maps a signed-in player onto Userback user_data', () => {
    expect(
      toUserbackIdentity({ id: 'u-1', username: 'emeka', email: 'e@example.com' }),
    ).toEqual({ id: 'u-1', info: { name: 'emeka', email: 'e@example.com' } });
  });

  it('leaves a guest anonymous rather than inventing an id', () => {
    expect(toUserbackIdentity(null)).toBeNull();
  });

  it('omits the email key entirely when the player has none', () => {
    const identity = toUserbackIdentity({ id: 'u-1', username: 'emeka', email: null });
    expect(identity).toEqual({ id: 'u-1', info: { name: 'emeka' } });
    expect(identity && 'email' in identity.info).toBe(false);
  });

  it('omits a whitespace-only email instead of sending a blank reply-to', () => {
    const identity = toUserbackIdentity({ id: 'u-1', username: 'emeka', email: '   ' });
    expect(identity && 'email' in identity.info).toBe(false);
  });

  it('trims surrounding whitespace off every field', () => {
    expect(
      toUserbackIdentity({ id: ' u-1 ', username: ' emeka ', email: ' e@example.com ' }),
    ).toEqual({ id: 'u-1', info: { name: 'emeka', email: 'e@example.com' } });
  });

  it('falls back to a placeholder name so a report is never signed by an empty string', () => {
    expect(toUserbackIdentity({ id: 'u-1', username: '', email: null })).toEqual({
      id: 'u-1',
      info: { name: 'Player' },
    });
  });

  it('refuses an id-less profile so reports do not pile up under one phantom user', () => {
    expect(toUserbackIdentity({ id: '  ', username: 'emeka', email: null })).toBeNull();
  });
});

describe('sameUserbackIdentity', () => {
  const identity = { id: 'u-1', info: { name: 'emeka', email: 'e@example.com' } };

  it('treats two guests as the same', () => {
    expect(sameUserbackIdentity(null, null)).toBe(true);
  });

  it('treats a guest and a signed-in player as different', () => {
    expect(sameUserbackIdentity(null, identity)).toBe(false);
    expect(sameUserbackIdentity(identity, null)).toBe(false);
  });

  it('matches equal identities held in different objects', () => {
    expect(
      sameUserbackIdentity(identity, { id: 'u-1', info: { name: 'emeka', email: 'e@example.com' } }),
    ).toBe(true);
  });

  it('notices a renamed player, not just a different account', () => {
    expect(sameUserbackIdentity(identity, { id: 'u-1', info: { name: 'ada', email: 'e@example.com' } })).toBe(false);
    expect(sameUserbackIdentity(identity, { id: 'u-2', info: { name: 'emeka', email: 'e@example.com' } })).toBe(false);
    expect(sameUserbackIdentity(identity, { id: 'u-1', info: { name: 'emeka' } })).toBe(false);
  });
});
