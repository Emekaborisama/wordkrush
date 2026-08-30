/**
 * A leftover crew must not trap a player on "Already on a team". Create and
 * join clear the stale membership first, and the owner has to disband because
 * the server rejects a leave from the owner (error 0007).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();

vi.mock('../auth/client', () => ({
  supabase: { rpc: (name: string, args?: unknown) => rpc(name, args) },
  isBackendConfigured: true,
}));

const { clearExistingMembership, createTeam, joinTeam } = await import('./api');

const OPEN_CREW = {
  id: 'team-opencrew',
  name: 'OpenCrew',
  invite_code: 'WDVP6J',
  created_at: '2026-08-30T10:00:00.000Z',
};

const HUMMER = 'player-hummer';
const OTHER = 'player-other';

/** `my_team` shaped as the RPC returns it, with `hummer` as owner. */
function leftoverCrew(members: Array<{ id: string; name: string; role: 'owner' | 'member' }>) {
  return {
    team: { ...OPEN_CREW, owner_id: HUMMER },
    members: members.map((member) => ({
      team_id: OPEN_CREW.id,
      player_id: member.id,
      username: member.name,
      role: member.role,
      joined_at: '2026-08-30T10:00:00.000Z',
    })),
    progress: [],
  };
}

function freshRoom(ownerId: string) {
  return {
    team: {
      id: 'team-new',
      name: 'Race Room',
      owner_id: ownerId,
      invite_code: 'NEWRM7',
      created_at: '2026-08-30T12:00:00.000Z',
    },
    members: [
      {
        team_id: 'team-new',
        player_id: ownerId,
        username: 'hummer',
        role: 'owner',
        joined_at: '2026-08-30T12:00:00.000Z',
      },
    ],
    progress: [],
  };
}

/** Names of the RPCs called, in order. */
function calls() {
  return rpc.mock.calls.map(([name]) => name as string);
}

beforeEach(() => {
  rpc.mockReset();
});

describe('clearExistingMembership', () => {
  it('disbands the crew the player owns', async () => {
    rpc.mockImplementation((name: string) => {
      if (name === 'my_team') {
        return Promise.resolve({
          data: leftoverCrew([{ id: HUMMER, name: 'hummer', role: 'owner' }]),
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    await clearExistingMembership(HUMMER);

    expect(calls()).toEqual(['my_team', 'disband_team']);
  });

  it('never asks the owner to leave, because the server answers 0007', async () => {
    rpc.mockImplementation((name: string) => {
      if (name === 'my_team') {
        return Promise.resolve({
          data: leftoverCrew([{ id: HUMMER, name: 'hummer', role: 'owner' }]),
          error: null,
        });
      }
      if (name === 'leave_team') {
        return Promise.resolve({
          data: null,
          error: { message: '0007: team owner cannot leave' },
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    await clearExistingMembership(HUMMER);

    expect(calls()).not.toContain('leave_team');
  });

  it('leaves the crew the player only belongs to', async () => {
    rpc.mockImplementation((name: string) => {
      if (name === 'my_team') {
        return Promise.resolve({
          data: leftoverCrew([
            { id: HUMMER, name: 'hummer', role: 'owner' },
            { id: OTHER, name: 'ada', role: 'member' },
          ]),
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    await clearExistingMembership(OTHER);

    expect(calls()).toEqual(['my_team', 'leave_team']);
  });

  it('touches nothing when the player has no crew', async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    await clearExistingMembership(HUMMER);

    expect(calls()).toEqual(['my_team']);
  });

  it('leaves the crew alone when the membership read fails', async () => {
    rpc.mockImplementation((name: string) => {
      if (name === 'my_team') {
        return Promise.resolve({ data: null, error: { message: 'network down' } });
      }
      return Promise.resolve({ data: null, error: null });
    });

    await clearExistingMembership(HUMMER);

    // A failed read must not fall through to leave_team: for an owner that is
    // the 0007 error, and it would drop a crew the player is still using.
    expect(calls()).toEqual(['my_team']);
  });
});

describe('create and join escape a leftover crew', () => {
  it('lets the leftover owner create a room after the auto-disband', async () => {
    rpc.mockImplementation((name: string) => {
      if (name === 'my_team') {
        return Promise.resolve({
          data: leftoverCrew([{ id: HUMMER, name: 'hummer', role: 'owner' }]),
          error: null,
        });
      }
      if (name === 'create_team') {
        return Promise.resolve({ data: freshRoom(HUMMER), error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    await clearExistingMembership(HUMMER);
    const created = await createTeam('Race Room');

    expect(calls()).toEqual(['my_team', 'disband_team', 'create_team']);
    expect(created.ok && created.value.team.name).toBe('Race Room');
  });

  it('lets the leftover member create a room after the auto-leave', async () => {
    rpc.mockImplementation((name: string) => {
      if (name === 'my_team') {
        return Promise.resolve({
          data: leftoverCrew([
            { id: HUMMER, name: 'hummer', role: 'owner' },
            { id: OTHER, name: 'ada', role: 'member' },
          ]),
          error: null,
        });
      }
      if (name === 'create_team') {
        return Promise.resolve({ data: freshRoom(OTHER), error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    await clearExistingMembership(OTHER);
    const created = await createTeam('Race Room');

    expect(calls()).toEqual(['my_team', 'leave_team', 'create_team']);
    expect(created.ok).toBe(true);
  });

  it('lets the leftover owner join a code after the auto-disband', async () => {
    rpc.mockImplementation((name: string) => {
      if (name === 'my_team') {
        return Promise.resolve({
          data: leftoverCrew([{ id: HUMMER, name: 'hummer', role: 'owner' }]),
          error: null,
        });
      }
      if (name === 'join_team') {
        return Promise.resolve({ data: freshRoom(OTHER), error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    await clearExistingMembership(HUMMER);
    const joined = await joinTeam('NEWRM7');

    expect(calls()).toEqual(['my_team', 'disband_team', 'join_team']);
    expect(joined.ok).toBe(true);
  });

  it('lets the leftover member join a code after the auto-leave', async () => {
    rpc.mockImplementation((name: string) => {
      if (name === 'my_team') {
        return Promise.resolve({
          data: leftoverCrew([
            { id: HUMMER, name: 'hummer', role: 'owner' },
            { id: OTHER, name: 'ada', role: 'member' },
          ]),
          error: null,
        });
      }
      if (name === 'join_team') {
        return Promise.resolve({ data: freshRoom(HUMMER), error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    await clearExistingMembership(OTHER);
    const joined = await joinTeam('NEWRM7');

    expect(calls()).toEqual(['my_team', 'leave_team', 'join_team']);
    expect(joined.ok).toBe(true);
  });

  it('reproduces the trap: creating without the escape still fails', async () => {
    rpc.mockImplementation((name: string) => {
      if (name === 'create_team') {
        return Promise.resolve({ data: null, error: { message: 'Already on a team' } });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const created = await createTeam('Race Room');

    expect(created.ok).toBe(false);
    expect(created.ok === false && created.error).toBe('Already on a team');
  });
});
