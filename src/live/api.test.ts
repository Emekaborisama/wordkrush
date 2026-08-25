import { describe, expect, it } from 'vitest';
import { parseMatchSnapshot } from './api';
import { remainingMs } from './types';

describe('parseMatchSnapshot', () => {
  it('accepts a racing payload', () => {
    const parsed = parseMatchSnapshot({
      match: {
        id: 'm1',
        team_id: 't1',
        game_id: 'clueless',
        level_number: 4,
        host_id: 'p1',
        status: 'racing',
        seed: 99,
        started_at: '2026-08-25T10:00:00.000Z',
        ends_at: '2026-08-25T10:03:00.000Z',
        created_at: '2026-08-25T09:59:00.000Z',
      },
      players: [
        {
          match_id: 'm1',
          player_id: 'p1',
          username: 'boris',
          ready: true,
          score: 6,
          complete: false,
          status: 'racing',
          placement: null,
          finished_at: null,
        },
      ],
    });
    expect(parsed?.match.gameId).toBe('clueless');
    expect(parsed?.match.seed).toBe(99);
    expect(parsed?.players[0]?.username).toBe('boris');
  });
});

describe('remainingMs', () => {
  it('clamps at zero after the clock', () => {
    expect(remainingMs('2026-08-25T10:00:00.000Z', new Date('2026-08-25T10:01:00.000Z'))).toBe(0);
    expect(remainingMs('2026-08-25T10:01:00.000Z', new Date('2026-08-25T10:00:00.000Z'))).toBe(60_000);
  });
});
