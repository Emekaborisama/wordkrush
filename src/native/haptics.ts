/**
 * Web haptics, via the browser Vibration API.
 *
 * Metro resolves `haptics.native.ts` on iOS/Android and this file on web, so
 * calling code never branches on platform. See docs/HOW-IT-WORKS.md §2.
 *
 * This file used to be five empty no-ops, on the reasoning that the Vibration
 * API "is unsupported in Safari and feels wrong on a laptop". Both halves of
 * that are true, and both are handled by `canVibrate()` below — but they only
 * describe desktop Safari and laptops. Android Chrome on a phone supports
 * `navigator.vibrate` and vibration feels right there, and since D-042 sends
 * players to wordkrush.com from Reddit, the phone browser is a primary
 * surface rather than an afterthought. So the capability is detected instead
 * of assumed (STACK D-043).
 *
 * Patterns mirror `haptics.native.ts` in shape: a tick for selection, a short
 * knock for the common positive beat, a stuttered buzz for a rejection, and a
 * rising three-beat flourish for the moments worth celebrating.
 */

/**
 * True only where a buzz is both possible and wanted.
 *
 * `navigator.vibrate` absent rules out Safari and every iOS browser (they all
 * use WebKit). `(pointer: coarse)` rules out laptops and desktops, whose
 * primary input is a mouse or trackpad — Chrome exposes `vibrate` there and
 * silently does nothing, so without this check the drawer would offer a switch
 * that could never fire.
 *
 * Exported because the drawer uses it to decide whether to show the vibration
 * row at all; `haptics.native.ts` exports the same name returning true.
 */
export function canVibrate(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/**
 * A rejected `vibrate` must never interrupt a run, same rule as the native
 * twin. Browsers also refuse it before the first user gesture and while the
 * tab is hidden, both of which throw or return false rather than warning.
 */
function buzz(pattern: number | number[]): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* blocked by the browser, or no vibration hardware */
  }
}

export async function tapCorrect(): Promise<void> {
  buzz(20);
}

export async function tapWrong(): Promise<void> {
  // Stuttered rather than one long buzz: two knocks read as "no", where a
  // single 100ms buzz just reads as noise.
  buzz([35, 45, 35]);
}

export async function tapLight(): Promise<void> {
  buzz(12);
}

export async function tapSelect(): Promise<void> {
  // Fires once per letter in a Wordfall trace, so it has to stay tiny.
  buzz(8);
}

export async function tapCelebrate(): Promise<void> {
  // Rising three-beat, matching the native flourish: short, longer, longest.
  buzz([12, 55, 20, 55, 40]);
}
