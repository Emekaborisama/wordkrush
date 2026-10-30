/**
 * Flags on shared boards: `players.country_code`, from migration 0009. Until
 * that is applied both calls fail quietly and boards show no flags, so nothing
 * here may ever stop a board loading. Guests are not on these boards; their
 * flag stays on the device (D-072).
 */
import { supabase } from '../auth/client';
import { normalizeCountry } from '../duel/country';

export type PlayerCountries = ReadonlyMap<string, string>;

export const NO_COUNTRIES: PlayerCountries = new Map();

/** Network input: anything that is not a known country is left without a flag. */
export function parsePlayerCountries(value: unknown): PlayerCountries {
  if (!Array.isArray(value)) return NO_COUNTRIES;
  const countries = new Map<string, string>();
  for (const candidate of value) {
    if (typeof candidate !== 'object' || candidate === null) continue;
    const { id, country_code: code } = candidate as Record<string, unknown>;
    const country = normalizeCountry(code);
    if (typeof id === 'string' && country) countries.set(id, country);
  }
  return countries;
}

export async function loadPlayerCountries(ids: readonly string[]): Promise<PlayerCountries> {
  if (!supabase || ids.length === 0) return NO_COUNTRIES;
  try {
    const { data, error } = await supabase.from('players').select('id,country_code').in('id', [...ids]);
    return error ? NO_COUNTRIES : parsePlayerCountries(data as unknown);
  } catch {
    return NO_COUNTRIES;
  }
}

/** Keeps a signed-in player's flag current; `null` removes it when they hide it. */
export async function publishCountry(playerId: string, country: string | null): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('players').update({ country_code: country }).eq('id', playerId);
  } catch {
    /* non-fatal: the board just shows no flag */
  }
}
