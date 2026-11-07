/**
 * The 1v1 network: Supabase Realtime presence and broadcast. Public channels,
 * no tables and no sign-in, so a guest can play a stranger (STACK D-072).
 * Anything can be sent on a public channel, so every inbound payload goes
 * through the parsers in `rules.ts` and a bad one is simply dropped.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../auth/client';
import type { DuelTransport, QueueLink, RoomLink } from './controller';
import { parsePlayer, parseProgress, parseSeed, type Searcher } from './rules';

const QUEUE_CHANNEL = 'wk-duel-queue-v1';

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= 64 ? value : null;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function close(channel: RealtimeChannel): void {
  void supabase?.removeChannel(channel);
}

/** A broadcast that never throws: a dropped message is what the handshake retries are for. */
function send(channel: RealtimeChannel, event: string, payload: Record<string, unknown>): void {
  void channel.send({ type: 'broadcast', event, payload }).catch(() => undefined);
}

export const realtimeDuelTransport: DuelTransport = {
  openQueue(selfKey, playerId, joinedAt, handlers) {
    if (!supabase) return null;
    const channel = supabase.channel(QUEUE_CHANNEL, {
      config: { presence: { key: selfKey }, broadcast: { self: false } },
    });
    channel.on('presence', { event: 'sync' }, () => {
      const searchers: Searcher[] = [];
      for (const [key, metas] of Object.entries(channel.presenceState())) {
        const meta = record(metas[0]);
        const player = text(meta.playerId);
        if (player && typeof meta.joinedAt === 'number') searchers.push({ key, playerId: player, joinedAt: meta.joinedAt });
      }
      handlers.onSearchers(searchers);
    });
    const addressed = (event: string, run: (from: string, room: string) => void) =>
      channel.on('broadcast', { event }, ({ payload }) => {
        const row = record(payload);
        const from = text(row.from);
        const room = text(row.room);
        if (row.to === selfKey && from && room) run(from, room);
      });
    addressed('pick', handlers.onPick);
    addressed('accept', handlers.onAccept);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') void channel.track({ playerId, joinedAt }).catch(() => undefined);
    });
    const link: QueueLink = {
      pick: (to, room) => send(channel, 'pick', { to, from: selfKey, room }),
      accept: (to, room) => send(channel, 'accept', { to, from: selfKey, room }),
      close: () => close(channel),
    };
    return link;
  },

  openRoom(code, handlers) {
    if (!supabase) return null;
    const channel = supabase.channel(`wk-duel-room-${code}`, { config: { broadcast: { self: false } } });
    channel.on('broadcast', { event: 'ready' }, ({ payload }) => {
      const player = parsePlayer(record(payload).player);
      if (player) handlers.onReady(player);
    });
    channel.on('broadcast', { event: 'go' }, ({ payload }) => {
      const row = record(payload);
      const player = parsePlayer(row.player);
      const seed = parseSeed(row.seed);
      if (player && seed !== null) handlers.onGo(player, seed);
    });
    channel.on('broadcast', { event: 'score' }, ({ payload }) => {
      const from = text(record(payload).from);
      const progress = parseProgress(payload);
      if (from && progress) handlers.onScore(from, progress);
    });
    channel.on('broadcast', { event: 'bye' }, ({ payload }) => {
      const from = text(record(payload).from);
      if (from) handlers.onBye(from);
    });
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') handlers.onJoined();
    });
    const link: RoomLink = {
      ready: (player) => send(channel, 'ready', { player }),
      go: (player, seed) => send(channel, 'go', { player, seed }),
      score: (from, progress) => send(channel, 'score', { from, ...progress }),
      bye: (from) => send(channel, 'bye', { from }),
      close: () => close(channel),
    };
    return link;
  },
};
