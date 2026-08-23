import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { resolveAttribution, type ArrivalAttribution } from './attribution';

export type ArrivalContext = {
  attribution: ArrivalAttribution;
  isWeb: boolean;
  hasHref: boolean;
};

export async function readArrivalContext(): Promise<ArrivalContext> {
  const href = readWebHref() ?? (await Linking.getInitialURL());
  return {
    attribution: resolveAttribution({
      href,
      referrer: readWebReferrer(),
    }),
    isWeb: Platform.OS === 'web',
    hasHref: Boolean(href),
  };
}

function readWebHref(): string | null {
  if (typeof window === 'undefined') return null;
  const href = window.location.href?.trim();
  return href ? href : null;
}

function readWebReferrer(): string | null {
  if (typeof document === 'undefined') return null;
  const referrer = document.referrer?.trim();
  return referrer ? referrer : null;
}
