/**
 * Web build: haptics are a no-op.
 *
 * Metro resolves `haptics.native.ts` on iOS/Android and this file on web, so
 * calling code never branches on platform. See docs/HOW-IT-WORKS.md §2.
 */
export async function tapCorrect(): Promise<void> {}
export async function tapWrong(): Promise<void> {}
