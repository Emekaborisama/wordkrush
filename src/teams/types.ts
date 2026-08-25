import type { PathGameId } from '../games/campaign';

export type TeamRole = 'owner' | 'member';

export type Team = {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  createdAt: string;
};

export type TeamMember = {
  teamId: string;
  playerId: string;
  username: string;
  role: TeamRole;
  joinedAt: string;
};

export type TeamProgress = {
  teamId: string;
  gameId: PathGameId;
  unlocked: number;
};

export type TeamSnapshot = {
  team: Team;
  members: TeamMember[];
  progress: TeamProgress[];
};
