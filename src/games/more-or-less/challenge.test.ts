import { describe, expect, it } from 'vitest';
import { decodeShareData, encodeShareData } from '../share-data';
import { challengeFromShare, challengeVerdict, shareTokenFromPath } from './challenge';

describe('challengeFromShare', () => {
  it('reads the run and the streak to beat from a shared result', () => {
    const token = encodeShareData({
      game: 'more-or-less',
      streak: 7,
      bestStreak: 9,
      challenge: { seed: 123456, path: 'world', level: 2 },
    });
    expect(challengeFromShare(decodeShareData(token))).toEqual({ seed: 123456, path: 'world', level: 2, target: 7 });
  });

  it('ignores shares without a run, other games and malformed payloads', () => {
    expect(challengeFromShare({ game: 'more-or-less', streak: 3, bestStreak: 3 })).toBeNull();
    expect(challengeFromShare(null)).toBeNull();
    expect(
      challengeFromShare({ game: 'more-or-less', streak: 3, bestStreak: 3, challenge: { seed: -1, path: 'world', level: 2 } }),
    ).toBeNull();
    expect(
      challengeFromShare({ game: 'more-or-less', streak: 3, bestStreak: 3, challenge: { seed: 1, path: 'world', level: 0 } }),
    ).toBeNull();
  });
});

describe('shareTokenFromPath', () => {
  it('finds the token in a share address', () => {
    expect(shareTokenFromPath('/share/abc_DEF-12')).toBe('abc_DEF-12');
    expect(shareTokenFromPath('/share/abc/')).toBe('abc');
    expect(shareTokenFromPath('/isabilagos')).toBeNull();
    expect(shareTokenFromPath('/share/abc/og.png')).toBeNull();
  });
});

describe('challengeVerdict', () => {
  it('beats, ties or falls short of the target', () => {
    expect(challengeVerdict(7, 8)).toBe('won');
    expect(challengeVerdict(7, 7)).toBe('tied');
    expect(challengeVerdict(7, 3)).toBe('lost');
  });
});
