/**
 * Who a player is in a 1v1. Guests have no username, so they get a friendly
 * generated name: nothing to moderate, nothing to type. The country is a flag
 * beside the name, the player's to change or hide (see `identity-storage.ts`).
 * Pure.
 */
import { normalizeCountry } from './country';
import type { DuelPlayer } from './rules';

const ADJECTIVES = ['Swift', 'Sharp', 'Brave', 'Quick', 'Bright', 'Clever', 'Bold', 'Sunny', 'Lucky', 'Mighty', 'Calm', 'Keen'];
const ANIMALS = ['Panda', 'Lion', 'Fox', 'Falcon', 'Otter', 'Tiger', 'Zebra', 'Eagle', 'Koala', 'Giraffe', 'Dolphin', 'Parrot'];

export type DuelIdentity = {
  /** Random and device-local: never an account id, and it goes to the other player. */
  id: string;
  guestName: string;
  country: string | null;
  /** The player picked this flag themselves; detection will not overwrite it. */
  countryChosen: boolean;
  flagHidden: boolean;
};

export function guestName(random: () => number): string {
  const pick = (list: readonly string[]) => list[Math.floor(random() * list.length)];
  return `${pick(ADJECTIVES)} ${pick(ANIMALS)}`;
}

export function newIdentity(random: () => number): DuelIdentity {
  const id = Array.from({ length: 16 }, () => Math.floor(random() * 36).toString(36)).join('');
  return { id, guestName: guestName(random), country: null, countryChosen: false, flagHidden: false };
}

export function parseIdentity(raw: string | null): DuelIdentity | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { id, guestName: name, country, countryChosen, flagHidden } = value as Record<string, unknown>;
    if (typeof id !== 'string' || !/^[a-z0-9]{8,32}$/.test(id)) return null;
    if (typeof name !== 'string' || name.length === 0) return null;
    return {
      id,
      guestName: name,
      country: normalizeCountry(country),
      countryChosen: countryChosen === true,
      flagHidden: flagHidden === true,
    };
  } catch {
    return null;
  }
}

/** The player as the other side sees them: username if signed in, flag unless hidden. */
export function duelPlayerFrom(identity: DuelIdentity, username: string | null): DuelPlayer {
  return {
    id: identity.id,
    name: username ?? identity.guestName,
    country: identity.flagHidden ? null : identity.country,
  };
}
