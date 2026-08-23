/**
 * Web build: haptics are a no-op.
 *
 * Metro resolves `haptics.native.ts` on iOS/Android and this file on web, so
 * calling code never branches on platform. See docs/HOW-IT-WORKS.md §2.
 *
 * The Vibration API exists in some browsers but is unsupported in Safari and
 * feels wrong on a laptop, so web deliberately gets nothing. Web still gets the
 * sound half of the feedback — see `native/sound.ts`, which has no twin.
 *
 * Keep this file's exports in step with `haptics.native.ts`; a missing stub
 * here is a web-only crash that native testing will not catch.
 */
export async function tapCorrect(): Promise<void> {}
export async function tapWrong(): Promise<void> {}
export async function tapLight(): Promise<void> {}
export async function tapSelect(): Promise<void> {}
export async function tapCelebrate(): Promise<void> {}
