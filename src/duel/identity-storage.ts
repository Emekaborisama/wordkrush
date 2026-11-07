/**
 * Device storage for the 1v1 identity, and finding the country for the flag.
 * The country lives on this device and goes only to the opponent of a match;
 * it is never stored on a server. Failures fall back to no flag.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { countryFromLocale, normalizeCountry } from './country';
import { newIdentity, parseIdentity, withDetectedCountry, type DuelIdentity } from './identity';

const STORAGE_KEY = 'wordkrush.duel.identity.v1';
const COUNTRY_TIMEOUT_MS = 2_500;

export async function saveIdentity(identity: DuelIdentity): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    /* non-fatal: a new name next launch */
  }
}

/** Cloudflare's view of the visitor's country, from our own server. */
async function serverCountry(): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COUNTRY_TIMEOUT_MS);
  try {
    const origin = Platform.OS === 'web' ? '' : 'https://wordkrush.com';
    const response = await fetch(`${origin}/country`, { signal: controller.signal });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return normalizeCountry((body as { country?: unknown } | null)?.country);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function localeCountry(): string | null {
  try {
    return countryFromLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return null;
  }
}

async function storedIdentity(): Promise<DuelIdentity | null> {
  try {
    return parseIdentity(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Loads the identity, creating it the first time. A first visit waits for its flag. */
export async function loadIdentity(): Promise<DuelIdentity> {
  const stored = await storedIdentity();
  const identity = stored ?? newIdentity(Math.random);
  if (identity.country !== null || identity.countryChosen) {
    if (!stored) await saveIdentity(identity);
    return identity;
  }
  const country = (await serverCountry()) ?? localeCountry();
  const next = { ...identity, country };
  await saveIdentity(next);
  return next;
}

/**
 * Looks at the connection again without holding up the launch, so a flag that
 * came from a VPN corrects itself. Reads storage after the wait, so a flag
 * picked in the meantime wins.
 */
export async function refreshCountry(): Promise<DuelIdentity | null> {
  const seen = await serverCountry();
  const identity = await storedIdentity();
  if (!identity) return null;
  const next = withDetectedCountry(identity, seen ?? (identity.country === null ? localeCountry() : null));
  if (next !== identity) await saveIdentity(next);
  return next;
}
