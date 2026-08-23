/**
 * iOS / Android haptics.
 *
 * Metro resolves this file on native and `haptics.ts` on web, so calling code
 * never branches on platform. This is also part of the App Store Guideline 4.2
 * case: real native feedback, not a website in a wrapper (STACK D-002).
 *
 * Callers should generally go through `native/feedback.ts` rather than importing
 * this directly — that module pairs each game moment with its sound and honours
 * the player's vibration switch.
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

/**
 * The lightest available knock, for events frequent enough that a full
 * notification buzz would become noise — a letter joining the current trace,
 * a valid but ordinary word.
 */
export async function tapLight(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* ignore */
  }
}

/**
 * The system "selection moved" tick. Distinct from `tapLight` on iOS, where it
 * is drier and quieter — the right texture for dragging across a board.
 */
export async function tapSelect(): Promise<void> {
  try {
    await Haptics.selectionAsync();
  } catch {
    /* ignore */
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A rising three-beat flourish for the two moments worth celebrating: clearing
 * a level and winning a run.
 *
 * Built by hand because `expo-haptics` has no pattern API — it exposes one-shot
 * impacts only. The gaps are ~90ms: closer and iOS coalesces the taps into a
 * single smudge, wider and it stops reading as one gesture.
 */
export async function tapCelebrate(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await wait(90);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await wait(90);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* ignore */
  }
}
