/**
 * iOS / Android haptics.
 *
 * Metro resolves this file on native and `haptics.ts` on web, so calling code
 * never branches on platform. This is also part of the App Store Guideline 4.2
 * case: real native feedback, not a website in a wrapper (STACK D-002).
 */
import * as Haptics from 'expo-haptics';

/**
 * Every call is wrapped: haptics are unavailable on some devices and in the
 * simulator, and a rejected promise here must never interrupt a run. The
 * feedback is a nicety; the game is the point.
 */
export async function tapCorrect(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* device without a taptic engine, or simulator */
  }
}

export async function tapWrong(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    /* ignore */
  }
}
