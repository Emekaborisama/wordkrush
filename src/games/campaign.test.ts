import { describe, expect, it } from 'vitest';
import {
  applyMatchUnlocks,
  isUnlocked,
  LIVE_ROSTER_LABEL,
  pickerStatus,
  playerCountBucket,
  unlockAfterWin,
} from './campaign';

describe('unlockAfterWin', () => {
  it('opens the next slot after a win and never rewinds', () => {
    expect(unlockAfterWin(1, 1)).toBe(2);
    expect(unlockAfterWin(5, 5)).toBe(6);
    expect(unlockAfterWin(12, 8)).toBe(12);
  });
});

describe('isUnlocked', () => {
  it('treats the cursor as inclusive', () => {
    expect(isUnlocked(1, 1)).toBe(true);
    expect(isUnlocked(3, 5)).toBe(true);
    expect(isUnlocked(6, 5)).toBe(false);
    expect(isUnlocked(0, 5)).toBe(false);
  });
});

describe('pickerStatus', () => {
  it('locks anything above the team cursor', () => {
    expect(pickerStatus(6, 8, 5)).toBe('locked');
  });

  it('marks a team-opened row the player has not beaten as team-ahead', () => {
    expect(pickerStatus(5, 3, 5)).toBe('team_ahead');
    expect(pickerStatus(4, 3, 5)).toBe('team_ahead');
  });

  it('marks the shared cursor current when the player is caught up', () => {
    expect(pickerStatus(5, 5, 5)).toBe('current');
    expect(pickerStatus(3, 5, 5)).toBe('open');
  });
});

describe('applyMatchUnlocks', () => {
  it('advances the team when anyone completes, and personal only on a complete', () => {
    expect(
      applyMatchUnlocks({
        personalUnlocked: 3,
        teamUnlocked: 4,
        levelNumber: 4,
        playerCompleted: false,
        anyoneCompleted: true,
      }),
    ).toEqual({ personalUnlocked: 3, teamUnlocked: 5 });
  });

  it('advances both cursors when this player completed', () => {
    expect(
      applyMatchUnlocks({
        personalUnlocked: 4,
        teamUnlocked: 4,
        levelNumber: 4,
        playerCompleted: true,
        anyoneCompleted: true,
      }),
    ).toEqual({ personalUnlocked: 5, teamUnlocked: 5 });
  });

  it('leaves both cursors alone when nobody completed', () => {
    expect(
      applyMatchUnlocks({
        personalUnlocked: 4,
        teamUnlocked: 4,
        levelNumber: 4,
        playerCompleted: false,
        anyoneCompleted: false,
      }),
    ).toEqual({ personalUnlocked: 4, teamUnlocked: 4 });
  });

  it('does not grant a personal skip when the team was already ahead', () => {
    expect(
      applyMatchUnlocks({
        personalUnlocked: 2,
        teamUnlocked: 5,
        levelNumber: 5,
        playerCompleted: false,
        anyoneCompleted: true,
      }),
    ).toEqual({ personalUnlocked: 2, teamUnlocked: 6 });
  });
});

describe('playerCountBucket', () => {
  it('stays inside the live roster range', () => {
    expect(LIVE_ROSTER_LABEL).toBe('2–10');
    expect(playerCountBucket(1)).toBe('2');
    expect(playerCountBucket(2)).toBe('2');
    expect(playerCountBucket(4)).toBe('4');
    expect(playerCountBucket(7)).toBe('7');
    expect(playerCountBucket(10)).toBe('10');
    expect(playerCountBucket(11)).toBe('10');
  });
});
