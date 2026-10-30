/**
 * One player's side of a 1v1, from "find an opponent" to the result. No React
 * and no Supabase: the transport comes in through an interface, so two
 * controllers can play each other in a test with a fake network and clock.
 *
 * Random match: everyone searching sits in a shared queue. The longest-waiting
 * pair agree a room by a two-step handshake (pick, then accept), because two
 * devices can briefly see different queues. In the room the guest repeats
 * `ready` until the host answers `go` with the seed, then both count down from
 * that moment. If nobody turns up, a ghost steps in.
 */
import { ghostAt, ghostPlan, ghostPlayer } from './ghost';
import {
  COUNTDOWN_MS,
  DUEL_MS,
  GHOST_AFTER_MS,
  HEARTBEAT_MS,
  isRoomCode,
  partnerFor,
  settle,
  SILENCE_FORFEIT_MS,
  START_PROGRESS,
  type DuelPlayer,
  type Progress,
  type Searcher,
  type Verdict,
} from './rules';

export type QueueLink = { pick: (to: string, room: string) => void; accept: (to: string, room: string) => void; close: () => void };
export type QueueHandlers = {
  onSearchers: (searchers: Searcher[]) => void;
  onPick: (from: string, room: string) => void;
  onAccept: (from: string, room: string) => void;
};
export type RoomLink = {
  ready: (player: DuelPlayer) => void;
  go: (player: DuelPlayer, seed: number) => void;
  score: (from: string, progress: Progress) => void;
  bye: (from: string) => void;
  close: () => void;
};
export type RoomHandlers = {
  onJoined: () => void;
  onReady: (player: DuelPlayer) => void;
  onGo: (player: DuelPlayer, seed: number) => void;
  onScore: (from: string, progress: Progress) => void;
  onBye: (from: string) => void;
};
/** Either returns `null` when online play is not available in this build. */
export type DuelTransport = {
  openQueue: (selfKey: string, playerId: string, joinedAt: number, handlers: QueueHandlers) => QueueLink | null;
  openRoom: (code: string, handlers: RoomHandlers) => RoomLink | null;
};

export type DuelState =
  | { phase: 'idle' }
  | { phase: 'searching'; since: number }
  /** A friend link is out; waiting for them to open it. */
  | { phase: 'inviting'; room: string }
  | { phase: 'joining' }
  | { phase: 'failed'; message: string }
  | { phase: 'countdown'; opponent: DuelPlayer; seed: number; until: number }
  | { phase: 'playing'; opponent: DuelPlayer; seed: number; startedAt: number; them: Progress }
  | { phase: 'ended'; opponent: DuelPlayer; seed: number; verdict: Verdict; me: Progress; them: Progress; opponentLeft: boolean };

export type DuelOptions = {
  me: DuelPlayer;
  bestStreak: number;
  transport: DuelTransport;
  onChange: (state: DuelState) => void;
  /** Test seams; the app uses the real ones. */
  now?: () => number;
  random?: () => number;
};

/** How long a handshake may hang before going back to looking. */
const HANDSHAKE_MS = 6_000;
const READY_EVERY_MS = 600;
const PICK_EVERY_MS = 1_500;
const TICK_MS = 250;
/** Time for the other player's last message to land after the clock. */
const CLOCK_GRACE_MS = 1_200;
/** Time for our last message to leave before the channel closes. */
const FLUSH_MS = 1_500;

export class DuelController {
  private state: DuelState = { phase: 'idle' };
  private readonly now: () => number;
  private readonly random: () => number;
  private queue: QueueLink | null = null;
  private room: RoomLink | null = null;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private ticker: ReturnType<typeof setInterval> | null = null;
  private readyLoop: ReturnType<typeof setInterval> | null = null;
  private pickLoop: ReturnType<typeof setInterval> | null = null;
  private searchers: Searcher[] = [];
  private handshake: ReturnType<typeof setTimeout> | null = null;
  private selfKey = '';
  private searchStarted = 0;
  private pendingRoom: string | null = null;
  private pendingPartner: string | null = null;
  private lastPick = 0;
  private committed = false;
  private seed: number | null = null;
  private opponent: DuelPlayer | null = null;
  private mine: Progress = START_PROGRESS;
  private plan: Progress[] | null = null;
  private lastHeard = 0;
  private lastBeat = 0;

  constructor(private readonly options: DuelOptions) {
    this.now = options.now ?? Date.now;
    this.random = options.random ?? Math.random;
  }

  get current(): DuelState {
    return this.state;
  }

  /** Random match: look for a person, and fall back to a ghost. */
  findOpponent(): void {
    this.reset();
    this.search(this.now());
  }

  /** Open a private room for a friend. Returns its code, or `null` when offline. */
  inviteFriend(): string | null {
    this.reset();
    const code = this.newRoomCode();
    if (!this.enterRoom(code, 'host')) {
      this.set({ phase: 'failed', message: 'Online play is not available right now.' });
      return null;
    }
    this.set({ phase: 'inviting', room: code });
    return code;
  }

  /** Open a friend's link. */
  joinInvite(code: string): void {
    this.reset();
    if (!isRoomCode(code) || !this.enterRoom(code, 'guest')) {
      this.set({ phase: 'failed', message: 'That invite does not work.' });
      return;
    }
    this.set({ phase: 'joining' });
    this.handshake = setTimeout(() => {
      this.teardown();
      this.set({ phase: 'failed', message: 'That match has started, or your friend has gone. Ask them for a new link.' });
    }, HANDSHAKE_MS * 2);
  }

  /**
   * My run moved on. False once the clock has run out: the whistle is final, so
   * both sides settle on the same answers even though the grace period is open.
   */
  report(progress: Progress): boolean {
    if (this.state.phase !== 'playing' || this.now() - this.state.startedAt > DUEL_MS) return false;
    this.mine = progress;
    this.room?.score(this.options.me.id, progress);
    this.lastBeat = this.now();
    this.evaluate();
    return true;
  }

  /** Quit: tell the other player and stop everything. */
  leave(): void {
    this.room?.bye(this.options.me.id);
    this.reset();
    this.set({ phase: 'idle' });
  }

  private set(state: DuelState): void {
    this.state = state;
    this.options.onChange(state);
  }

  private later(ms: number, run: () => void): void {
    const id = setTimeout(() => {
      this.timers.delete(id);
      run();
    }, ms);
    this.timers.add(id);
  }

  private newRoomCode(): string {
    return Array.from({ length: 12 }, () => Math.floor(this.random() * 36).toString(36)).join('');
  }

  private newSeed(): number {
    return Math.floor(this.random() * 0xffffffff);
  }

  private clearHandshake(): void {
    if (this.handshake !== null) clearTimeout(this.handshake);
    this.handshake = null;
    if (this.readyLoop !== null) clearInterval(this.readyLoop);
    this.readyLoop = null;
  }

  private teardown(): void {
    this.clearHandshake();
    if (this.pickLoop !== null) clearInterval(this.pickLoop);
    this.pickLoop = null;
    this.searchers = [];
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
    if (this.ticker !== null) clearInterval(this.ticker);
    this.ticker = null;
    this.queue?.close();
    this.queue = null;
    this.room?.close();
    this.room = null;
  }

  private reset(): void {
    this.teardown();
    this.pendingRoom = null;
    this.pendingPartner = null;
    this.committed = false;
    this.seed = null;
    this.opponent = null;
    this.mine = START_PROGRESS;
    this.plan = null;
  }

  /** Into the queue; `since` survives a failed handshake, so the ghost's wait is not restarted. */
  private search(since: number): void {
    this.selfKey = this.newRoomCode();
    this.searchStarted = since;
    this.committed = false;
    this.pendingRoom = null;
    this.pendingPartner = null;
    this.set({ phase: 'searching', since });
    const { me, transport } = this.options;
    const wait = Math.max(0, GHOST_AFTER_MS - (this.now() - since));
    this.later(wait, () => {
      if (!this.committed) this.startGhost();
    });
    this.queue = transport.openQueue(this.selfKey, me.id, this.now(), {
      onSearchers: (searchers) => {
        this.searchers = searchers;
        this.tryPick();
      },
      onPick: (from, room) => {
        if (this.committed || !isRoomCode(room)) return;
        this.committed = true;
        this.queue?.accept(from, room);
        this.leaveQueueFor(room, 'guest');
      },
      onAccept: (_from, room) => {
        if (this.committed || room !== this.pendingRoom) return;
        this.committed = true;
        this.leaveQueueFor(room, 'host');
      },
    });
    // No backend in this build: a ghost is still a game.
    if (!this.queue) {
      this.committed = true;
      this.startGhost();
      return;
    }
    // A pick can be lost, and the queue may not change again to prompt another.
    this.pickLoop = setInterval(() => this.tryPick(), PICK_EVERY_MS);
  }

  private tryPick(): void {
    if (this.committed) return;
    const pair = partnerFor(this.searchers, this.selfKey);
    if (!pair?.host || this.now() - this.lastPick < PICK_EVERY_MS) return;
    this.lastPick = this.now();
    // Same room for every repeat to one partner: on a slow connection their
    // accept can arrive after the next repeat, and must still count.
    const room = pair.partner.key === this.pendingPartner && this.pendingRoom ? this.pendingRoom : this.newRoomCode();
    this.pendingPartner = pair.partner.key;
    this.pendingRoom = room;
    this.queue?.pick(pair.partner.key, room);
  }

  private leaveQueueFor(room: string, role: 'host' | 'guest'): void {
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
    if (this.pickLoop !== null) clearInterval(this.pickLoop);
    this.pickLoop = null;
    const link = this.queue;
    this.queue = null;
    // Let the accept reach the host before this channel closes.
    setTimeout(() => link?.close(), FLUSH_MS);
    if (!this.enterRoom(room, role)) {
      this.startGhost();
      return;
    }
    // A partner who vanishes mid-handshake puts us back in the queue.
    this.handshake = setTimeout(() => {
      if (this.state.phase !== 'searching') return;
      this.teardown();
      this.search(this.searchStarted);
    }, HANDSHAKE_MS);
  }

  private enterRoom(code: string, role: 'host' | 'guest'): boolean {
    const { me, transport } = this.options;
    this.room = transport.openRoom(code, {
      onJoined: () => {
        if (role !== 'guest') return;
        this.room?.ready(me);
        this.readyLoop = setInterval(() => this.room?.ready(me), READY_EVERY_MS);
      },
      onReady: (player) => {
        if (role !== 'host') return;
        // A link pasted in a group chat: the first friend in plays, the rest get no reply.
        if (this.opponent && player.id !== this.opponent.id) return;
        if (this.seed === null) this.seed = this.newSeed();
        this.room?.go(me, this.seed);
        if (!this.opponent) {
          this.opponent = player;
          this.startCountdown();
        }
      },
      onGo: (player, seed) => {
        if (role !== 'guest' || this.opponent) return;
        this.opponent = player;
        this.seed = seed;
        this.startCountdown();
      },
      onScore: (from, progress) => {
        if (from === this.opponent?.id) this.onScore(progress);
      },
      onBye: (from) => {
        if (from === this.opponent?.id) this.onOpponentLeft();
      },
    });
    return this.room !== null;
  }

  private startGhost(): void {
    this.committed = true;
    this.teardown();
    const seed = this.newSeed();
    this.seed = seed;
    this.opponent = ghostPlayer(seed);
    this.plan = ghostPlan(seed, this.options.bestStreak);
    this.startCountdown();
  }

  private startCountdown(): void {
    this.clearHandshake();
    const { opponent, seed } = this;
    if (!opponent || seed === null) return;
    this.set({ phase: 'countdown', opponent, seed, until: this.now() + COUNTDOWN_MS });
    this.later(COUNTDOWN_MS, () => this.startPlaying());
  }

  private startPlaying(): void {
    const { opponent, seed } = this;
    if (!opponent || seed === null) return;
    const startedAt = this.now();
    this.lastHeard = startedAt;
    this.lastBeat = startedAt;
    this.set({ phase: 'playing', opponent, seed, startedAt, them: START_PROGRESS });
    this.ticker = setInterval(() => this.tick(), TICK_MS);
  }

  private tick(): void {
    if (this.state.phase !== 'playing') return;
    const now = this.now();
    const elapsed = now - this.state.startedAt;
    if (this.plan) {
      const them = ghostAt(this.plan, elapsed);
      if (them !== this.state.them) this.set({ ...this.state, them });
    } else {
      if (now - this.lastBeat >= HEARTBEAT_MS) {
        this.lastBeat = now;
        this.room?.score(this.options.me.id, this.mine);
      }
      if (now - this.lastHeard >= SILENCE_FORFEIT_MS) {
        this.onOpponentLeft();
        return;
      }
    }
    this.evaluate();
  }

  private onScore(progress: Progress): void {
    this.lastHeard = this.now();
    if (this.state.phase !== 'playing') return;
    this.set({ ...this.state, them: progress });
    this.evaluate();
  }

  private evaluate(): void {
    if (this.state.phase !== 'playing') return;
    const clockUp = this.now() - this.state.startedAt >= DUEL_MS + CLOCK_GRACE_MS;
    const verdict = settle(this.mine, this.state.them, clockUp);
    if (verdict) this.finish(verdict, false);
  }

  private onOpponentLeft(): void {
    if (this.state.phase === 'playing') {
      this.finish('won', true);
      return;
    }
    if (this.state.phase === 'countdown') {
      this.teardown();
      this.set({ phase: 'failed', message: 'Your opponent left before the start.' });
    }
  }

  private finish(verdict: Verdict, opponentLeft: boolean): void {
    if (this.state.phase !== 'playing') return;
    const { opponent, seed, them } = this.state;
    const me = { ...this.mine, done: true };
    if (this.ticker !== null) clearInterval(this.ticker);
    this.ticker = null;
    // The last word: without it the other side cannot settle a tie.
    this.room?.score(this.options.me.id, me);
    const room = this.room;
    this.room = null;
    setTimeout(() => room?.close(), FLUSH_MS);
    this.set({ phase: 'ended', opponent, seed, verdict, me, them, opponentLeft });
  }
}
