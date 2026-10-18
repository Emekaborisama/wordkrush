import { describe, expect, it } from 'vitest';
import {
  COMPLETED_ONBOARDING,
  UNSEEN_ONBOARDING,
  isValidOnboardingState,
  parseOnboardingState,
} from './types';

describe('onboarding defaults', () => {
  it('starts unseen so a first launch still gets the welcome', () => {
    expect(UNSEEN_ONBOARDING).toEqual({ completed: false });
    expect(COMPLETED_ONBOARDING).toEqual({ completed: true });
  });
});

describe('isValidOnboardingState', () => {
  it('accepts a well-formed object', () => {
    expect(isValidOnboardingState({ completed: true })).toBe(true);
    expect(isValidOnboardingState({ completed: false })).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'done'],
    ['a missing flag', {}],
    ['a non-boolean flag', { completed: 'yes' }],
    ['an array', []],
  ])('rejects %s', (_label, value) => {
    expect(isValidOnboardingState(value)).toBe(false);
  });
});

describe('parseOnboardingState', () => {
  it('round-trips what storage wrote', () => {
    expect(parseOnboardingState(JSON.stringify(COMPLETED_ONBOARDING))).toEqual(
      COMPLETED_ONBOARDING,
    );
    expect(parseOnboardingState(JSON.stringify(UNSEEN_ONBOARDING))).toEqual(
      UNSEEN_ONBOARDING,
    );
  });

  it.each([
    ['nothing stored yet', null],
    ['an empty string', ''],
    ['malformed JSON', '{oops'],
    ['valid JSON of the wrong shape', '{"completed":1}'],
    ['JSON null', 'null'],
  ])('falls back to unseen for %s', (_label, raw) => {
    expect(parseOnboardingState(raw)).toEqual(UNSEEN_ONBOARDING);
  });

  it('keeps a stored completed flag rather than resetting it', () => {
    expect(parseOnboardingState('{"completed":true}')).toEqual(COMPLETED_ONBOARDING);
  });
});
