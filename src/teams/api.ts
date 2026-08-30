/**
 * Teams API. All writes go through RPCs; the publishable key never bypasses RLS.
 */
import { supabase } from '../auth/client';
import { isPathGameId, type PathGameId } from '../games/campaign';
import { isInviteCode, normalizeInviteCode } from './codes';
import type { Team, TeamMember, TeamProgress, TeamRole, TeamSnapshot } from './types';

export type TeamApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'unconfigured' | 'unavailable' | 'error'; error: string };

const UNCONFIGURED = 'Online play is not configured in this build.';

function fail<T>(reason: 'unconfigured' | 'unavailable' | 'error', error: string): TeamApiResult<T> {
  return { ok: false, reason, error };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function asIso(value: unknown): string | null {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return null;
  return value;
}

function parseTeam(value: unknown): Team | null {
  const row = asRecord(value);
  if (!row) return null;
  if (
    typeof row.id !== 'string' ||
    typeof row.name !== 'string' ||
    typeof row.owner_id !== 'string' ||
    typeof row.invite_code !== 'string' ||
    typeof row.created_at !== 'string'
  ) {
    return null;
  }
  const createdAt = asIso(row.created_at);
  if (!createdAt) return null;
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    inviteCode: row.invite_code,
    createdAt,
  };
}

function parseMember(value: unknown): TeamMember | null {
  const row = asRecord(value);
  if (!row) return null;
  const role = row.role === 'owner' || row.role === 'member' ? (row.role as TeamRole) : null;
  const joinedAt = asIso(row.joined_at);
  if (
    typeof row.team_id !== 'string' ||
    typeof row.player_id !== 'string' ||
    typeof row.username !== 'string' ||
    !role ||
    !joinedAt
  ) {
    return null;
  }
  return {
    teamId: row.team_id,
    playerId: row.player_id,
    username: row.username,
    role,
    joinedAt,
  };
}

function parseProgress(value: unknown): TeamProgress | null {
  const row = asRecord(value);
  if (!row) return null;
  if (typeof row.team_id !== 'string' || typeof row.game_id !== 'string' || typeof row.unlocked !== 'number') {
    return null;
  }
  if (!isPathGameId(row.game_id) || !Number.isInteger(row.unlocked) || row.unlocked < 1) return null;
  return { teamId: row.team_id, gameId: row.game_id, unlocked: row.unlocked };
}

export function parseTeamSnapshot(value: unknown): TeamSnapshot | null {
  const row = asRecord(value);
  if (!row) return null;
  const team = parseTeam(row.team);
  if (!team || !Array.isArray(row.members) || !Array.isArray(row.progress)) return null;
  const members = row.members.flatMap((item) => {
    const parsed = parseMember(item);
    return parsed ? [parsed] : [];
  });
  const progress = row.progress.flatMap((item) => {
    const parsed = parseProgress(item);
    return parsed ? [parsed] : [];
  });
  return { team, members, progress };
}

async function rpc<T>(
  name: string,
  args: Record<string, unknown>,
  parse: (value: unknown) => T | null,
  empty: T | null = null,
): Promise<TeamApiResult<T>> {
  if (!supabase) return fail('unconfigured', UNCONFIGURED);
  try {
    const { data, error } = await supabase.rpc(name, args);
    if (error) return fail('error', error.message);
    if (data == null) {
      if (empty !== null) return { ok: true, value: empty };
      return fail('error', 'Empty response');
    }
    const parsed = parse(data);
    if (!parsed) return fail('unavailable', 'Unexpected team response');
    return { ok: true, value: parsed };
  } catch {
    return fail('unavailable', 'Team service is unavailable.');
  }
}

export async function loadMyTeam(): Promise<TeamApiResult<TeamSnapshot | null>> {
  if (!supabase) return fail('unconfigured', UNCONFIGURED);
  try {
    const { data, error } = await supabase.rpc('my_team');
    if (error) return fail('error', error.message);
    if (data == null) return { ok: true, value: null };
    const parsed = parseTeamSnapshot(data);
    if (!parsed) return fail('unavailable', 'Unexpected team response');
    return { ok: true, value: parsed };
  } catch {
    return fail('unavailable', 'Team service is unavailable.');
  }
}

export async function createTeam(name: string): Promise<TeamApiResult<TeamSnapshot>> {
  return rpc('create_team', { p_name: name.trim() }, parseTeamSnapshot);
}

export async function joinTeam(code: string): Promise<TeamApiResult<TeamSnapshot>> {
  const normalized = normalizeInviteCode(code);
  if (!isInviteCode(normalized)) return fail('error', 'Enter a 6-character invite code.');
  return rpc('join_team', { p_code: normalized }, parseTeamSnapshot);
}

export async function renameTeam(name: string): Promise<TeamApiResult<TeamSnapshot>> {
  return rpc('rename_team', { p_name: name.trim() }, parseTeamSnapshot);
}

async function rpcEmpty(name: string): Promise<TeamApiResult<true>> {
  if (!supabase) return fail('unconfigured', UNCONFIGURED);
  try {
    const { error } = await supabase.rpc(name);
    if (error) return fail('error', error.message);
    return { ok: true, value: true };
  } catch {
    return fail('unavailable', 'Team service is unavailable.');
  }
}

export async function leaveTeam(): Promise<TeamApiResult<true>> {
  return rpcEmpty('leave_team');
}

export async function disbandTeam(): Promise<TeamApiResult<true>> {
  return rpcEmpty('disband_team');
}

/**
 * Release the crew the player is still on so create and join cannot be trapped
 * on "Already on a team". The owner has to disband, because the server rejects
 * a leave from the owner with error 0007; everyone else leaves. Shared with the
 * results screen, which releases the roster the same way after a race.
 */
export async function clearExistingMembership(profileId: string): Promise<void> {
  const teamResult = await loadMyTeam();
  if (!teamResult.ok || !teamResult.value) return;
  const isOwner = teamResult.value.team.ownerId === profileId;
  if (isOwner) {
    await disbandTeam();
  } else {
    await leaveTeam();
  }
}

export function teamUnlocked(snapshot: TeamSnapshot, gameId: PathGameId): number {
  return snapshot.progress.find((row) => row.gameId === gameId)?.unlocked ?? 1;
}
