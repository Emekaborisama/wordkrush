import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DuelController, type DuelState, type DuelTransport, type QueueHandlers, type RoomHandlers } from './controller';
import { DUEL_MS, GHOST_AFTER_MS, SILENCE_FORFEIT_MS, type Progress, type Searcher } from './rules';

/** A fake Realtime: one queue, many rooms, delivery on the next timer tick. */
function fakeNetwork(delayMs = 20) {
  const members = new Map<string, { searcher: Searcher; handlers: QueueHandlers }>();
  const rooms = new Map<string, Set<RoomHandlers>>();
  const later = (run: () => void) => setTimeout(run, delayMs);
  const syncQueue = () => {
    const searchers = [...members.values()].map((m) => m.searcher);
    for (const member of members.values()) later(() => member.handlers.onSearchers(searchers));
  };
  const transport = (): DuelTransport => ({
    openQueue(selfKey, playerId, joinedAt, handlers) {
      members.set(selfKey, { searcher: { key: selfKey, playerId, joinedAt }, handlers });
      syncQueue();
      return {
        pick: (to, room) => later(() => members.get(to)?.handlers.onPick(selfKey, room)),
        accept: (to, room) => later(() => members.get(to)?.handlers.onAccept(selfKey, room)),
        close: () => {
          members.delete(selfKey);
          syncQueue();
        },
      };
    },
    openRoom(code, handlers) {
      const room = rooms.get(code) ?? new Set<RoomHandlers>();
      rooms.set(code, room);
      room.add(handlers);
      const others = () => [...room].filter((h) => h !== handlers);
      later(() => handlers.onJoined());
      return {
        ready: (player) => others().forEach((h) => later(() => h.onReady(player))),
        go: (player, seed) => others().forEach((h) => later(() => h.onGo(player, seed))),
        score: (from, progress) => others().forEach((h) => later(() => h.onScore(from, progress))),
        bye: (from) => others().forEach((h) => later(() => h.onBye(from))),
        close: () => room.delete(handlers),
      };
    },
  });
  return { transport };
}

function player(id: string, net: ReturnType<typeof fakeNetwork>, offline = false) {
  const states: DuelState[] = [];
  const controller = new DuelController({
    me: { id, name: `Player ${id}`, country: 'NG' },
    bestStreak: 5,
    transport: offline ? { openQueue: () => null, openRoom: () => null } : net.transport(),
    onChange: (state) => states.push(state),
  });
  return { controller, states, phase: () => controller.current.phase };
}

const progress = (streak: number, done: boolean, atMs = streak * 3000): Progress => ({ streak, done, atMs });
const run = (ms: number) => vi.advanceTimersByTime(ms);

describe('a 1v1', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function matched() {
    const net = fakeNetwork();
    const a = player('a', net);
    const b = player('b', net);
    a.controller.findOpponent();
    run(50);
    b.controller.findOpponent();
    run(4000);
    return { a, b };
  }

  it('pairs two searchers on the same seed and counts both down', () => {
    const { a, b } = matched();
    expect(a.phase()).toBe('playing');
    expect(b.phase()).toBe('playing');
    const [sa, sb] = [a.controller.current, b.controller.current];
    if (sa.phase !== 'playing' || sb.phase !== 'playing') throw new Error('not playing');
    expect(sa.seed).toBe(sb.seed);
    expect(sa.opponent.id).toBe('b');
    expect(sb.opponent.id).toBe('a');
    expect(sa.opponent.ghost).toBeUndefined();
  });

  it('never leaves either player with a ghost once they have paired', () => {
    const { a } = matched();
    run(GHOST_AFTER_MS + 1000);
    const state = a.controller.current;
    expect(state.phase === 'playing' && state.opponent.ghost).toBeFalsy();
  });

  it('shows each player the other streak live', () => {
    const { a, b } = matched();
    a.controller.report(progress(2, false));
    run(100);
    const state = b.controller.current;
    expect(state.phase === 'playing' && state.them.streak).toBe(2);
  });

  it('ends for both as soon as the leader passes the one who missed', () => {
    const { a, b } = matched();
    a.controller.report(progress(2, false));
    b.controller.report(progress(1, false));
    run(100);
    b.controller.report(progress(1, true));
    run(100);
    expect(a.phase()).toBe('ended');
    expect(b.phase()).toBe('ended');
    const [ra, rb] = [a.controller.current, b.controller.current];
    expect(ra.phase === 'ended' && ra.verdict).toBe('won');
    expect(rb.phase === 'ended' && rb.verdict).toBe('lost');
  });

  it('gives the same answer on both sides when both finish level', () => {
    const { a, b } = matched();
    a.controller.report(progress(3, true, 9000));
    run(100);
    b.controller.report(progress(3, true, 7000));
    run(100);
    const [ra, rb] = [a.controller.current, b.controller.current];
    expect(ra.phase === 'ended' && ra.verdict).toBe('lost');
    expect(rb.phase === 'ended' && rb.verdict).toBe('won');
  });

  it('settles at the clock when both are still going', () => {
    const { a, b } = matched();
    a.controller.report(progress(9, false));
    b.controller.report(progress(7, false));
    run(DUEL_MS + 3000);
    const [ra, rb] = [a.controller.current, b.controller.current];
    expect(ra.phase === 'ended' && ra.verdict).toBe('won');
    expect(rb.phase === 'ended' && rb.verdict).toBe('lost');
  });

  it('wins by forfeit when the other player quits', () => {
    const { a, b } = matched();
    b.controller.leave();
    run(100);
    const state = a.controller.current;
    expect(state.phase === 'ended' && state.verdict).toBe('won');
    expect(state.phase === 'ended' && state.opponentLeft).toBe(true);
  });

  it('wins by forfeit when the other player goes silent', () => {
    const net = fakeNetwork();
    const a = player('a', net);
    const b = player('b', net);
    a.controller.findOpponent();
    run(50);
    b.controller.findOpponent();
    run(4000);
    // b's device drops: its timers stop, so nothing more reaches a.
    b.controller['ticker'] && clearInterval(b.controller['ticker']);
    run(SILENCE_FORFEIT_MS + 1000);
    const state = a.controller.current;
    expect(state.phase === 'ended' && state.opponentLeft).toBe(true);
  });

  it('repeats a pick that got lost, even if the queue does not change', () => {
    const net = fakeNetwork();
    const a = player('a', net);
    const b = player('b', net);
    a.controller.findOpponent();
    run(50);
    // b is in the queue but deaf to its first pick.
    const original = b.controller['committed'];
    b.controller['committed'] = true;
    b.controller.findOpponent();
    b.controller['committed'] = true;
    run(500);
    b.controller['committed'] = original;
    run(6000);
    expect(a.phase()).toBe('playing');
    expect(b.phase()).toBe('playing');
  });

  it('still pairs when the accept lands after the pick has been repeated', () => {
    const net = fakeNetwork(1600);
    const a = player('a', net);
    const b = player('b', net);
    a.controller.findOpponent();
    b.controller.findOpponent();
    run(GHOST_AFTER_MS + 500);
    expect(a.phase()).not.toBe('searching');
    const opponentOf = (state: DuelState) => ('opponent' in state ? state.opponent : null);
    expect(opponentOf(a.controller.current)?.id).toBe('b');
    expect(opponentOf(b.controller.current)?.id).toBe('a');
  });

  it('keeps a second friend out of a match that has started', () => {
    const net = fakeNetwork();
    const host = player('h', net);
    const guest = player('g', net);
    const late = player('x', net);
    const code = host.controller.inviteFriend() ?? '';
    guest.controller.joinInvite(code);
    run(4000);
    expect(host.phase()).toBe('playing');
    late.controller.joinInvite(code);
    run(1000);
    expect(late.phase()).toBe('joining');
    // A stranger's score and exit are nothing to do with this match.
    late.controller['room']?.score('x', progress(9, true));
    late.controller.leave();
    run(1000);
    expect(host.phase()).toBe('playing');
    expect(guest.phase()).toBe('playing');
    const state = host.controller.current;
    expect(state.phase === 'playing' ? state.them.streak : -1).toBe(0);
  });

  it('tells a late friend the match has gone', () => {
    const net = fakeNetwork();
    const host = player('h', net);
    const guest = player('g', net);
    const late = player('x', net);
    const code = host.controller.inviteFriend() ?? '';
    guest.controller.joinInvite(code);
    run(4000);
    late.controller.joinInvite(code);
    run(13_000);
    expect(late.phase()).toBe('failed');
  });

  it('counts nothing after the whistle, even in the grace period', () => {
    const { a, b } = matched();
    run(1000);
    const state = a.controller.current;
    if (state.phase !== 'playing') throw new Error('expected a match');
    run(state.startedAt + DUEL_MS + 100 - Date.now());
    expect(a.phase()).toBe('playing');
    expect(a.controller.report(progress(9, false, DUEL_MS + 50))).toBe(false);
    run(3000);
    const ended = a.controller.current;
    expect(ended.phase === 'ended' ? ended.me.streak : -1).toBe(0);
    expect(b.phase()).toBe('ended');
  });

  it('falls back to a labelled ghost when nobody comes', () => {
    const net = fakeNetwork();
    const a = player('a', net);
    a.controller.findOpponent();
    run(GHOST_AFTER_MS - 100);
    expect(a.phase()).toBe('searching');
    run(200);
    const state = a.controller.current;
    expect(state.phase).toBe('countdown');
    expect(state.phase === 'countdown' && state.opponent.ghost).toBe(true);
  });

  it('plays a whole match against a ghost and reaches a result', () => {
    const net = fakeNetwork();
    const a = player('a', net);
    a.controller.findOpponent();
    run(GHOST_AFTER_MS + 3500);
    expect(a.phase()).toBe('playing');
    a.controller.report(progress(1, true));
    run(DUEL_MS + 3000);
    expect(a.phase()).toBe('ended');
  });

  it('offers a ghost straight away when online play is off', () => {
    const a = player('a', fakeNetwork(), true);
    a.controller.findOpponent();
    const state = a.controller.current;
    expect(state.phase === 'countdown' && state.opponent.ghost).toBe(true);
  });

  it('matches a friend through a private room, with no ghost', () => {
    const net = fakeNetwork();
    const host = player('h', net);
    const guest = player('g', net);
    const code = host.controller.inviteFriend();
    expect(host.phase()).toBe('inviting');
    run(GHOST_AFTER_MS + 2000);
    expect(host.phase()).toBe('inviting');
    guest.controller.joinInvite(code ?? '');
    run(4000);
    expect(host.phase()).toBe('playing');
    expect(guest.phase()).toBe('playing');
  });

  it('tells a friend when the invite is dead', () => {
    const guest = player('g', fakeNetwork());
    guest.controller.joinInvite('abc123');
    run(13_000);
    expect(guest.phase()).toBe('failed');
  });

  it('refuses a malformed invite', () => {
    const guest = player('g', fakeNetwork());
    guest.controller.joinInvite('NOT A ROOM');
    expect(guest.phase()).toBe('failed');
  });

  it('stops everything when a searcher backs out', () => {
    const net = fakeNetwork();
    const a = player('a', net);
    a.controller.findOpponent();
    run(100);
    a.controller.leave();
    expect(a.phase()).toBe('idle');
    run(GHOST_AFTER_MS + 5000);
    expect(a.phase()).toBe('idle');
  });
});
