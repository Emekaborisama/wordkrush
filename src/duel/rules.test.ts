import { describe, expect, it } from 'vitest';
import { isRoomCode, parsePlayer, parseProgress, parseSeed, partnerFor, roomFromPath, settle, type Progress } from './rules';

const run = (streak: number, done: boolean, atMs = 1000): Progress => ({ streak, done, atMs });

describe('settle', () => {
  it('waits while both are still playing', () => {
    expect(settle(run(3, false), run(5, false))).toBeNull();
  });

  it('gives it to the longer streak once both are done', () => {
    expect(settle(run(7, true), run(3, true))).toBe('won');
    expect(settle(run(3, true), run(7, true))).toBe('lost');
  });

  it('breaks a tie by who reached it first', () => {
    expect(settle(run(5, true, 20_000), run(5, true, 25_000))).toBe('won');
    expect(settle(run(5, true, 25_000), run(5, true, 20_000))).toBe('lost');
    expect(settle(run(5, true, 20_000), run(5, true, 20_000))).toBe('tied');
    expect(settle(run(0, true, 0), run(0, true, 0))).toBe('tied');
  });

  it('ends early when the player still going passes the one who missed', () => {
    expect(settle(run(4, false), run(3, true))).toBe('won');
    expect(settle(run(3, true), run(4, false))).toBe('lost');
    expect(settle(run(3, false), run(3, true))).toBeNull();
  });

  it('ends everything when the clock runs out', () => {
    expect(settle(run(6, false), run(4, false), true)).toBe('won');
    expect(settle(run(2, false), run(4, true), true)).toBe('lost');
  });
});

describe('partnerFor', () => {
  const a = { key: 'a', playerId: 'pa', joinedAt: 1 };
  const b = { key: 'b', playerId: 'pb', joinedAt: 2 };
  const c = { key: 'c', playerId: 'pc', joinedAt: 3 };

  it('pairs the longest-waiting first and makes the earlier the host', () => {
    expect(partnerFor([c, b, a], 'a')).toEqual({ partner: b, host: true });
    expect(partnerFor([c, b, a], 'b')).toEqual({ partner: a, host: false });
  });

  it('leaves the odd one out waiting', () => {
    expect(partnerFor([a, b, c], 'c')).toBeNull();
  });

  it('never pairs a player with themselves in another tab', () => {
    const otherTab = { key: 'a2', playerId: 'pa', joinedAt: 2 };
    expect(partnerFor([a, otherTab], 'a')).toBeNull();
  });

  it('finds nothing for a searcher not in the list', () => {
    expect(partnerFor([a, b], 'z')).toBeNull();
  });
});

describe('parsing what strangers send', () => {
  it('accepts a well-formed player', () => {
    expect(parsePlayer({ id: 'x1', name: 'Swift Panda', country: 'ng' })).toEqual({ id: 'x1', name: 'Swift Panda', country: 'NG' });
    expect(parsePlayer({ id: 'x1', name: 'Swift Panda', country: null })).toEqual({ id: 'x1', name: 'Swift Panda', country: null });
  });

  it('rejects names that break the username rules, and bad ids', () => {
    expect(parsePlayer({ id: 'x', name: '<script>' })).toBeNull();
    expect(parsePlayer({ id: 'x', name: 'a'.repeat(40) })).toBeNull();
    expect(parsePlayer({ id: '', name: 'Fine Name' })).toBeNull();
    expect(parsePlayer('nope')).toBeNull();
  });

  it('drops a bad country rather than the player', () => {
    expect(parsePlayer({ id: 'x', name: 'Fine Name', country: 'ZZ' })?.country).toBeNull();
  });

  it('rejects impossible progress', () => {
    expect(parseProgress({ streak: 4, done: false, atMs: 1200 })).toEqual({ streak: 4, done: false, atMs: 1200 });
    expect(parseProgress({ streak: 9999, done: false, atMs: 0 })).toBeNull();
    expect(parseProgress({ streak: -1, done: false, atMs: 0 })).toBeNull();
    expect(parseProgress({ streak: 1.5, done: false, atMs: 0 })).toBeNull();
    expect(parseProgress({ streak: 1, done: 'yes', atMs: 0 })).toBeNull();
    expect(parseProgress(null)).toBeNull();
  });

  it('checks seeds and room codes', () => {
    expect(parseSeed(123)).toBe(123);
    expect(parseSeed(-1)).toBeNull();
    expect(parseSeed('1')).toBeNull();
    expect(isRoomCode('abc123')).toBe(true);
    expect(isRoomCode('ab')).toBe(false);
    expect(isRoomCode('ABC123')).toBe(false);
  });

  it('finds the room in a duel link', () => {
    expect(roomFromPath('/duel/abc123')).toBe('abc123');
    expect(roomFromPath('/duel/abc123/')).toBe('abc123');
    expect(roomFromPath('/duel/AB')).toBeNull();
    expect(roomFromPath('/isabilagos')).toBeNull();
  });
});
