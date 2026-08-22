/**
 * Web build: haptics are a no-op.
 *
 * Metro resolves `haptics.native.ts` on iOS/Android and this file on web, so
 * calling code never branches on platform. See docs/HOW-IT-WORKS.md §2.
 *
 * The Vibration API exists in some browsers but is unsupported in Safari and
 * feels wrong on a laptop, so web deliberately gets nothing.
 */
export async function tapCorrect(): Promise<void> {}
export async function tapWrong(): Promise<void> {}
