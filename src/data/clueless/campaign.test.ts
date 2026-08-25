import { describe, expect, it } from 'vitest';
import { CLUELESS_SOLO_LEVELS, puzzleForCluelessSoloLevel } from './levels';
import {
  CLUELESS_TEAM_LEVELS,
  cluelessTeamLevelByNumber,
  puzzleForCluelessTeamLevel,
} from './campaign';

describe('Clueless team path', () => {
  it('numbers team levels consecutively', () => {
    expect(CLUELESS_TEAM_LEVELS.map((level) => level.number)).toEqual(
      CLUELESS_TEAM_LEVELS.map((_, index) => index + 1),
    );
    expect(cluelessTeamLevelByNumber(1)?.puzzleNumber).toBe(1);
  });

  it('never shares a secret with the solo path', () => {
    const teamSecrets = new Set(CLUELESS_TEAM_LEVELS.map((level) => puzzleForCluelessTeamLevel(level).secret));
    const soloSecrets = CLUELESS_SOLO_LEVELS.map((level) => puzzleForCluelessSoloLevel(level).secret);
    expect(soloSecrets.some((secret) => teamSecrets.has(secret))).toBe(false);
  });
});

describe('Clueless solo path catalog', () => {
  it('numbers levels consecutively and gives onboarding distinct secrets', () => {
    expect(CLUELESS_SOLO_LEVELS.map((level) => level.number)).toEqual(
      CLUELESS_SOLO_LEVELS.map((_, index) => index + 1),
    );
    const onboardingSecrets = CLUELESS_SOLO_LEVELS.slice(0, 3).map(
      (level) => puzzleForCluelessSoloLevel(level).secret,
    );
    expect(new Set(onboardingSecrets).size).toBe(3);
  });

  it('sets the three tutorial assistance policies in order', () => {
    expect(CLUELESS_SOLO_LEVELS.slice(0, 3).map((level) => level.hintPolicy)).toEqual([
      'opening',
      'guess_threshold',
      'none',
    ]);
  });

  it('only ships reviewed copy for levels where a hint can appear', () => {
    for (const level of CLUELESS_SOLO_LEVELS) {
      if (level.hintPolicy === 'none') {
        expect(level.hint).toBeNull();
      } else {
        const words = level.hint.trim().split(/\s+/);
        const secret = puzzleForCluelessSoloLevel(level).secret;
        const escapedSecret = secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        expect(words.length).toBeGreaterThanOrEqual(6);
        expect(words.length).toBeLessThanOrEqual(16);
        expect(level.hint).not.toMatch(new RegExp(`\\b${escapedSecret}(?:s|es|ed|ing)?\\b`, 'i'));
      }
    }
  });
});
