/**
 * Whether this player has opened I Sabi Lagos yet. Until they have, the hub
 * card wears a NEW tag and a returning player gets the one-time "NEW!" pop-up.
 * Non-fatal like the welcome: a lost write only shows the news again.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'wordkrush.seen.isabilagos.v1';

export async function loadLagosSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markLagosSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    /* non-fatal by design */
  }
}
