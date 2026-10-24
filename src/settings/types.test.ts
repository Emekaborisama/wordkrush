import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FEEDBACK_SETTINGS,
  isValidFeedbackSettings,
  parseFeedbackSettings,
  toggleChannel,
} from './types';

describe('feedback settings defaults', () => {
  it('ships with every channel on', () => {
    expect(DEFAULT_FEEDBACK_SETTINGS).toEqual({ sound: true, music: true, vibration: true });
  });
});

describe('toggleChannel', () => {
  it('flips only the named channel', () => {
    const muted = toggleChannel(DEFAULT_FEEDBACK_SETTINGS, 'sound');
    expect(muted).toEqual({ sound: false, music: true, vibration: true });

    const bothOff = toggleChannel(muted, 'vibration');
    expect(bothOff).toEqual({ sound: false, music: true, vibration: false });

    expect(toggleChannel(bothOff, 'music')).toEqual({ sound: false, music: false, vibration: false });
  });

  it('round-trips back to the original', () => {
    const once = toggleChannel(DEFAULT_FEEDBACK_SETTINGS, 'vibration');
    expect(toggleChannel(once, 'vibration')).toEqual(DEFAULT_FEEDBACK_SETTINGS);
  });

  it('does not mutate its input', () => {
    const start = { sound: true, music: true, vibration: true };
    toggleChannel(start, 'sound');
    expect(start).toEqual({ sound: true, music: true, vibration: true });
  });
});

describe('isValidFeedbackSettings', () => {
  it('accepts a well-formed object', () => {
    expect(isValidFeedbackSettings({ sound: true, music: false, vibration: false })).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'sound'],
    ['a missing channel', { sound: true }],
    ['a missing music channel', { sound: true, vibration: true }],
    ['a non-boolean channel', { sound: 'yes', vibration: true }],
    ['an array', []],
  ])('rejects %s', (_label, value) => {
    expect(isValidFeedbackSettings(value)).toBe(false);
  });
});

describe('parseFeedbackSettings', () => {
  it('round-trips what storage wrote', () => {
    const settings = { sound: false, music: false, vibration: true };
    expect(parseFeedbackSettings(JSON.stringify(settings))).toEqual(settings);
  });

  it.each([
    ['nothing stored yet', null],
    ['an empty string', ''],
    ['malformed JSON', '{oops'],
    ['valid JSON of the wrong shape', '{"sound":1}'],
    ['JSON null', 'null'],
  ])('falls back to the defaults for %s', (_label, raw) => {
    expect(parseFeedbackSettings(raw)).toEqual(DEFAULT_FEEDBACK_SETTINGS);
  });

  it('keeps a stored "off" rather than resetting it to the default on', () => {
    // Regression guard: an over-eager fallback here would silently un-mute the
    // game on every launch for anyone who turned sound off.
    expect(parseFeedbackSettings('{"sound":false,"music":false,"vibration":false}')).toEqual({
      sound: false,
      music: false,
      vibration: false,
    });
  });

  it('upgrades a pre-music save without losing its sound and vibration choices', () => {
    expect(parseFeedbackSettings('{"sound":false,"vibration":false}')).toEqual({
      sound: false,
      music: true,
      vibration: false,
    });
  });
});
