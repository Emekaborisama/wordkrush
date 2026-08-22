import type { Profile } from '../auth/auth';
import { supabase } from '../auth/client';
import type { ScoreBoard, ScoreEntry } from './types';

export type GlobalScore = {
  id: string;
  playerId: string;
  displayName: string;
  gameId: string;
  score: number;
  contextId: string;
  durationMs: number | null;
  playedAt: string;
  rank: number;
  verified: boolean;
};

export type GlobalLeaderboardResult =
  | { ok: true; entries: GlobalScore[] }
  | { ok: false; reason: 'unconfigured' | 'unavailable' };

type SubmissionResult = { ok: true } | { ok: false; reason: 'unconfigured' | 'unavailable' };

/** Supabase responses are network input, so the screen only receives rows that
 * match the public view's expected shape. */
export function parseGlobalScores(value: unknown): GlobalScore[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate) => {
    if (typeof candidate !== 'object' || candidate === null) return [];
    const row = candidate as Record<string, unknown>;
    if (
      typeof row.id !== 'string' ||
      typeof row.player_id !== 'string' ||
      typeof row.display_name !== 'string' ||
      typeof row.game_id !== 'string' ||
      typeof row.score !== 'number' ||
      !Number.isInteger(row.score) ||
      row.score < 0 ||
      typeof row.context_id !== 'string' ||
      (row.duration_ms !== null &&
        (typeof row.duration_ms !== 'number' ||
          !Number.isFinite(row.duration_ms) ||
          row.duration_ms < 0)) ||
      typeof row.played_at !== 'string' ||
      Number.isNaN(Date.parse(row.played_at)) ||
      typeof row.global_rank !== 'number' ||
      !Number.isInteger(row.global_rank) ||
      row.global_rank < 1 ||
      (row.status !== 'verified' && row.status !== 'unverified')
    ) {
      return [];
    }

    return [
      {
        id: row.id,
        playerId: row.player_id,
        displayName: row.display_name,
        gameId: row.game_id,
        score: row.score,
        contextId: row.context_id,
        durationMs: row.duration_ms,
        playedAt: row.played_at,
        rank: row.global_rank,
        verified: row.status === 'verified',
      },
    ];
  });
}

export async function loadGlobalLeaderboard(
  gameId: string,
  limit = 50,
): Promise<GlobalLeaderboardResult> {
  if (!supabase) return { ok: false, reason: 'unconfigured' };

  try {
    const { data, error } = await supabase
      .from('global_leaderboard')
      .select(
        'id,player_id,display_name,game_id,score,context_id,duration_ms,played_at,status,global_rank',
      )
      .eq('game_id', gameId)
      .order('global_rank', { ascending: true })
      .limit(limit);

    if (error) return { ok: false, reason: 'unavailable' };
    return { ok: true, entries: parseGlobalScores(data as unknown) };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export async function submitGlobalScore(
  gameId: string,
  entry: ScoreEntry,
  profile: Profile,
): Promise<SubmissionResult> {
  if (!supabase) return { ok: false, reason: 'unconfigured' };

  try {
    // Older accounts may predate the players table. This is idempotent and RLS
    // only permits the signed-in user to create or update their own profile.
    const { error: profileError } = await supabase
      .from('players')
      .upsert({ id: profile.id, display_name: profile.username });
    if (profileError) return { ok: false, reason: 'unavailable' };

    const { error } = await supabase.from('global_scores').upsert(
      {
        player_id: profile.id,
        game_id: gameId,
        score: entry.streak,
        context_id: entry.categoryId,
        seed: entry.seed,
        duration_ms: entry.durationMs ?? null,
        client_entry_id: entry.id,
        played_at: entry.playedAt,
      },
      {
        onConflict: 'player_id,client_entry_id',
        ignoreDuplicates: true,
      },
    );

    return error ? { ok: false, reason: 'unavailable' } : { ok: true };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** Uploads unsynced local runs and marks only confirmed submissions. A failed
 * network call leaves its row pending so a later app session can retry. */
export async function syncPendingScores(
  gameId: string,
  board: ScoreBoard,
  profile: Profile,
): Promise<ScoreBoard> {
  let changed = false;
  const history: ScoreEntry[] = [];

  for (const entry of board.history) {
    if (entry.synced) {
      history.push(entry);
      continue;
    }
    const result = await submitGlobalScore(gameId, entry, profile);
    if (result.ok) {
      changed = true;
      history.push({ ...entry, synced: true });
    } else {
      history.push(entry);
    }
  }

  return changed ? { ...board, history } : board;
}
