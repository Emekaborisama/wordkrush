/**
 * Local persistence for the reward wallet. Same rules as the daily flame:
 * offline-first, one key, and a failed read or write never blocks play.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMPTY_REWARDS, parseRewards, type RewardsState } from './types';

const KEY = 'wordkrush.rewards.v1';

export async function loadRewards(): Promise<RewardsState> {
  try {
    return parseRewards(await AsyncStorage.getItem(KEY));
  } catch {
    return EMPTY_REWARDS;
  }
}

export async function saveRewards(state: RewardsState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* non-fatal — the run already happened */
  }
}
