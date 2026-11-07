import { describe, expect, it } from 'vitest';
import type { Profile } from '../auth/auth';
import { parseGlobalScores, scoreContextForSubmission, syncPendingScores } from './global';
import type { ScoreBoard, ScoreEntry } from './types';

const row = {
  id: 'score-1',
  player_id: 'player-1',
  display_name: 'Emeka',
  game_id: 'more-or-less',
  score: 12,
  context_id: 'wikipedia-popularity',
  duration_ms: null,
  played_at: '2026-08-22T10:00:00.000Z',
  status: 'verified',
  global_rank: 3,
};

describe('parseGlobalScores', () => {
  it('maps a valid public leaderboard row', () => {
    expect(parseGlobalScores([row])).toEqual([
      {
        id: 'score-1',
        playerId: 'player-1',
        displayName: 'Emeka',
        gameId: 'more-or-less',
        score: 12,
        contextId: 'wikipedia-popularity',
        durationMs: null,
        playedAt: '2026-08-22T10:00:00.000Z',
        rank: 3,
        verified: true,
      },
    ]);
  });

  it('drops malformed and rejected rows', () => {
    expect(
      parseGlobalScores([
        { ...row, score: -1 },
        { ...row, global_rank: 0 },
        { ...row, played_at: 'not-a-date' },
        { ...row, status: 'rejected' },
      ]),
    ).toEqual([]);
  });

  it('returns an empty list for a non-array response', () => {
    expect(parseGlobalScores({ data: row })).toEqual([]);
  });
});

describe('scoreContextForSubmission', () => {
  it('maps legacy Clueless runs to Standard', () => {
    expect(scoreContextForSubmission('clueless', 'clueless')).toBe('standard');
    expect(scoreContextForSubmission('clueless', 'easy')).toBe('easy');
  });

  it('does not change other games', () => {
    expect(scoreContextForSubmission('more-or-less', 'wikipedia-popularity')).toBe(
      'wikipedia-popularity',
    );
  });
});

describe('syncPendingScores', () => {
  const profile: Profile = { id: 'player-1', username: 'ada', email: null };
  const row = (id: string, over: Partial<ScoreEntry> = {}): ScoreEntry => ({
    id,
    streak: 3,
    categoryId: 'wordfall:1',
    playedAt: '2026-10-18T12:00:00.000Z',
    seed: 1,
    ...over,
  });

  it('uploads only rows that are pending and not boosted', async () => {
    const board: ScoreBoard = {
      bestStreak: 3,
      totalRuns: 3,
      history: [
        row('boosted', { boosted: true }),
        row('clean'),
        row('done', { synced: true }),
      ],
    };
    const seen: string[] = [];
    const synced = await syncPendingScores('wordfall', board, profile, async (_gameId, entry) => {
      seen.push(entry.id);
      return { ok: true };
    });
    expect(seen).toEqual(['clean']);
    expect(synced.history.map((entry) => [entry.id, entry.synced, entry.boosted])).toEqual([
      ['boosted', undefined, true],
      ['clean', true, undefined],
      ['done', true, undefined],
    ]);
  });
});
