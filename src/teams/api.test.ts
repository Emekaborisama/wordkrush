import { describe, expect, it } from 'vitest';
import { parseTeamSnapshot } from './api';

describe('parseTeamSnapshot', () => {
  it('accepts a well-formed RPC payload and drops junk members', () => {
    const parsed = parseTeamSnapshot({
      team: {
        id: 't1',
        name: 'Krushers',
        owner_id: 'p1',
        invite_code: 'AB23CD',
        created_at: '2026-08-25T10:00:00.000Z',
      },
      members: [
        {
          team_id: 't1',
          player_id: 'p1',
          username: 'boris',
          role: 'owner',
          joined_at: '2026-08-25T10:00:00.000Z',
        },
        { player_id: 'bad' },
      ],
      progress: [{ team_id: 't1', game_id: 'wordfall', unlocked: 4 }],
    });
    expect(parsed?.team.name).toBe('Krushers');
    expect(parsed?.members).toHaveLength(1);
    expect(parsed?.progress[0]).toEqual({
      teamId: 't1',
      gameId: 'wordfall',
      unlocked: 4,
    });
  });

  it('rejects a missing team', () => {
    expect(parseTeamSnapshot({ members: [], progress: [] })).toBeNull();
  });
});
