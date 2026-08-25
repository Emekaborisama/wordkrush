/**
 * Live-match API. Writes go through RPCs; Realtime is a hint plus a poll.
 */
import { supabase } from '../auth/client';
import { isPathGameId, type PathGameId } from '../games/campaign';
import type {
  LiveMatch,
  LiveMatchSnapshot,
  LivePlayer,
  MatchPlayerStatus,
  MatchStatus,
} from './types';

export type LiveApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'unconfigured' | 'unavailable' | 'error'; error: string };

const UNCONFIGURED = 'Online play is not configured in this build.';

function fail<T>(reason: 'unconfigured' | 'unavailable' | 'error', error: string): LiveApiResult<T> {
  return { ok: false, reason, error };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function asIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return null;
  return value;
}

function parseMatch(value: unknown): LiveMatch | null {
  const row = asRecord(value);
  if (!row) return null;
  const status: MatchStatus | null =
    row.status === 'lobby' || row.status === 'racing' || row.status === 'finished'
      ? row.status
      : null;
  if (
    typeof row.id !== 'string' ||
    typeof row.team_id !== 'string' ||
    typeof row.game_id !== 'string' ||
    typeof row.level_number !== 'number' ||
    typeof row.host_id !== 'string' ||
    typeof row.created_at !== 'string' ||
    !status ||
    !isPathGameId(row.game_id) ||
    !Number.isInteger(row.level_number)
  ) {
    return null;
  }
  const createdAt = asIso(row.created_at);
  if (!createdAt) return null;
  const seed =
    row.seed == null ? null : typeof row.seed === 'number' && Number.isFinite(row.seed) ? row.seed : null;
  return {
    id: row.id,
    teamId: row.team_id,
    gameId: row.game_id,
    levelNumber: row.level_number,
    hostId: row.host_id,
    status,
    seed,
    startedAt: asIso(row.started_at),
    endsAt: asIso(row.ends_at),
    createdAt,
  };
}

function parsePlayer(value: unknown): LivePlayer | null {
  const row = asRecord(value);
  if (!row) return null;
  const status: MatchPlayerStatus | null =
    row.status === 'lobby' || row.status === 'racing' || row.status === 'done' ? row.status : null;
  if (
    typeof row.match_id !== 'string' ||
    typeof row.player_id !== 'string' ||
    typeof row.username !== 'string' ||
    typeof row.ready !== 'boolean' ||
    typeof row.score !== 'number' ||
    typeof row.complete !== 'boolean' ||
    !status ||
    !Number.isInteger(row.score)
  ) {
    return null;
  }
  const placement =
    row.placement == null
      ? null
      : typeof row.placement === 'number' && Number.isInteger(row.placement)
        ? row.placement
        : null;
  return {
    matchId: row.match_id,
    playerId: row.player_id,
    username: row.username,
    ready: row.ready,
    score: row.score,
    complete: row.complete,
    status,
    placement,
    finishedAt: asIso(row.finished_at),
  };
}

export function parseMatchSnapshot(value: unknown): LiveMatchSnapshot | null {
  const row = asRecord(value);
  if (!row) return null;
  const match = parseMatch(row.match);
  if (!match || !Array.isArray(row.players)) return null;
  const players = row.players.flatMap((item) => {
    const parsed = parsePlayer(item);
    return parsed ? [parsed] : [];
  });
  return { match, players };
}

async function rpc(
  name: string,
  args: Record<string, unknown>,
): Promise<LiveApiResult<LiveMatchSnapshot>> {
  if (!supabase) return fail('unconfigured', UNCONFIGURED);
  try {
    const { data, error } = await supabase.rpc(name, args);
    if (error) return fail('error', error.message);
    const parsed = parseMatchSnapshot(data);
    if (!parsed) return fail('unavailable', 'Unexpected match response');
    return { ok: true, value: parsed };
  } catch {
    return fail('unavailable', 'Live races are unavailable.');
  }
}

export async function loadActiveMatch(
  gameId: PathGameId,
): Promise<LiveApiResult<LiveMatchSnapshot | null>> {
  if (!supabase) return fail('unconfigured', UNCONFIGURED);
  try {
    const { data, error } = await supabase.rpc('active_match_for_game', { p_game_id: gameId });
    if (error) return fail('error', error.message);
    if (data == null) return { ok: true, value: null };
    const parsed = parseMatchSnapshot(data);
    if (!parsed) return fail('unavailable', 'Unexpected match response');
    return { ok: true, value: parsed };
  } catch {
    return fail('unavailable', 'Live races are unavailable.');
  }
}

export async function loadMatch(matchId: string): Promise<LiveApiResult<LiveMatchSnapshot>> {
  if (!supabase) return fail('unconfigured', UNCONFIGURED);
  try {
    const { data, error } = await supabase.rpc('match_snapshot', { p_match_id: matchId });
    if (error) return fail('error', error.message);
    const parsed = parseMatchSnapshot(data);
    if (!parsed) return fail('unavailable', 'Unexpected match response');
    return { ok: true, value: parsed };
  } catch {
    return fail('unavailable', 'Live races are unavailable.');
  }
}

export function createMatch(gameId: PathGameId, levelNumber: number) {
  return rpc('create_match', { p_game_id: gameId, p_level_number: levelNumber });
}

export function joinMatch(matchId: string) {
  return rpc('join_match', { p_match_id: matchId });
}

export function leaveMatch(matchId: string) {
  return rpc('leave_match', { p_match_id: matchId });
}

export async function cancelMatch(matchId: string): Promise<LiveApiResult<true>> {
  if (!supabase) return fail('unconfigured', UNCONFIGURED);
  try {
    const { error } = await supabase.rpc('cancel_match', { p_match_id: matchId });
    if (error) return fail('error', error.message);
    return { ok: true, value: true };
  } catch {
    return fail('unavailable', 'Live races are unavailable.');
  }
}

export function setReady(matchId: string, ready: boolean) {
  return rpc('set_ready', { p_match_id: matchId, p_ready: ready });
}

export function startMatch(matchId: string, durationMs: number) {
  return rpc('start_match', { p_match_id: matchId, p_duration_ms: durationMs });
}

export function postMatchScore(
  matchId: string,
  score: number,
  complete: boolean,
  done: boolean,
) {
  return rpc('post_match_score', {
    p_match_id: matchId,
    p_score: score,
    p_complete: complete,
    p_done: done,
  });
}

export function finishMatch(matchId: string) {
  return rpc('finish_match', { p_match_id: matchId });
}

export function subscribeMatch(
  matchId: string,
  onChange: () => void,
): () => void {
  if (!supabase) return () => undefined;
  const channel = supabase
    .channel(`match:${matchId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'match_players',
        filter: `match_id=eq.${matchId}`,
      },
      onChange,
    )
    .subscribe();
  return () => {
    void supabase?.removeChannel(channel);
  };
}
