/**
 * Local persistence for the first-run welcome. Mirrors `settings/storage.ts`:
 * offline-first and non-fatal on failure — a broken write may show the
 * welcome again next launch, which is better than blocking play.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COMPLETED_ONBOARDING,
  parseOnboardingState,
  type OnboardingState,
} from './types';

const KEY = 'wordkrush.onboarding.v1';

export async function loadOnboarding(): Promise<OnboardingState> {
  try {
    return parseOnboardingState(await AsyncStorage.getItem(KEY));
  } catch {
    return parseOnboardingState(null);
  }
}

export async function markOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(COMPLETED_ONBOARDING));
  } catch {
    /* non-fatal by design — they may see the welcome again next launch */
  }
}
