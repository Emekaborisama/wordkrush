/**
 * Local persistence for the feedback switches. Mirrors `streak/storage.ts`:
 * offline-first and non-fatal on failure — if the read fails the player gets
 * the defaults, which is a working game, not a broken one.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_FEEDBACK_SETTINGS,
  parseFeedbackSettings,
  type FeedbackSettings,
} from './types';

const KEY = 'wordkrush.feedback.v1';

export async function loadFeedbackSettings(): Promise<FeedbackSettings> {
  try {
    return parseFeedbackSettings(await AsyncStorage.getItem(KEY));
  } catch {
    return DEFAULT_FEEDBACK_SETTINGS;
  }
}

export async function saveFeedbackSettings(settings: FeedbackSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* non-fatal by design — the switch still applies for this session */
  }
}
