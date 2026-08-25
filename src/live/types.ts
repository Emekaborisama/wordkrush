import type { PathGameId } from '../games/campaign';

export type MatchStatus = 'lobby' | 'racing' | 'finished';
export type MatchPlayerStatus = 'lobby' | 'racing' | 'done';

export type LiveMatch = {
  id: string;
  teamId: string;
  gameId: PathGameId;
  levelNumber: number;
  hostId: string;
  status: MatchStatus;
  seed: number | null;
  startedAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

export type LivePlayer = {
  matchId: string;
  playerId: string;
  username: string;
  ready: boolean;
  score: number;
  complete: boolean;
  status: MatchPlayerStatus;
  placement: number | null;
  finishedAt: string | null;
};

export type LiveMatchSnapshot = {
  match: LiveMatch;
  players: LivePlayer[];
};

export function remainingMs(endsAt: string | null, now: Date = new Date()): number {
  if (!endsAt) return 0;
  const ends = Date.parse(endsAt);
  if (Number.isNaN(ends)) return 0;
  return Math.max(0, ends - now.getTime());
}
