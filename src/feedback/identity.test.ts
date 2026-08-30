import { describe, expect, it } from 'vitest';
import { toFeedbackIdentity } from './identity';

describe('toFeedbackIdentity', () => {
  it('maps a signed-in player onto a feedback identity', () => {
    expect(
      toFeedbackIdentity({ id: 'u-1', username: 'emeka', email: 'e@example.com' }),
    ).toEqual({ id: 'u-1', name: 'emeka', email: 'e@example.com' });
  });

  it('leaves a guest anonymous rather than inventing an id', () => {
    expect(toFeedbackIdentity(null)).toBeNull();
  });

  it('omits the email key entirely when the player has none', () => {
    const identity = toFeedbackIdentity({ id: 'u-1', username: 'emeka', email: null });
    expect(identity).toEqual({ id: 'u-1', name: 'emeka' });
    expect(identity && 'email' in identity).toBe(false);
  });

  it('omits a whitespace-only email instead of sending a blank reply-to', () => {
    const identity = toFeedbackIdentity({ id: 'u-1', username: 'emeka', email: '   ' });
    expect(identity && 'email' in identity).toBe(false);
  });

  it('trims surrounding whitespace off every field', () => {
    expect(
      toFeedbackIdentity({ id: ' u-1 ', username: ' emeka ', email: ' e@example.com ' }),
    ).toEqual({ id: 'u-1', name: 'emeka', email: 'e@example.com' });
  });

  it('falls back to a placeholder name so a report is never signed by an empty string', () => {
    expect(toFeedbackIdentity({ id: 'u-1', username: '', email: null })).toEqual({
      id: 'u-1',
      name: 'Player',
    });
  });

  it('refuses an id-less profile so reports do not pile up under one phantom user', () => {
    expect(toFeedbackIdentity({ id: '  ', username: 'emeka', email: null })).toBeNull();
  });
});
