import { describe, expect, it } from 'vitest';
import { parseGlobalScores } from './global';

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
