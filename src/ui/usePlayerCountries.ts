import { useEffect, useState } from 'react';
import { loadPlayerCountries, NO_COUNTRIES, type PlayerCountries } from '../scores/countries';

/** Flags for the players on screen. Loads once per set of ids, however the list is ordered. */
export function usePlayerCountries(ids: readonly string[]): PlayerCountries {
  const [countries, setCountries] = useState<PlayerCountries>(NO_COUNTRIES);
  const key = [...ids].sort().join(',');
  useEffect(() => {
    if (!key) return;
    let active = true;
    void loadPlayerCountries(key.split(',')).then((next) => {
      if (active) setCountries(next);
    });
    return () => {
      active = false;
    };
  }, [key]);
  return countries;
}
