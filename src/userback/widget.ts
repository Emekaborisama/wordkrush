/**
 * Web build: the Userback feedback widget.
 *
 * Metro resolves `widget.native.ts` on iOS/Android and this file on web, so
 * calling code never branches on platform — the same split `native/haptics.ts`
 * uses.
 *
 * Two rules, borrowed from `native/sound.ts` because they apply for the same
 * reason:
 *
 * 1. **Never interrupt a run.** Every call into the widget is wrapped. An
 *    ad blocker, an offline tab, a Userback outage — all of those resolve to
 *    "no feedback button", never to a thrown error. Collecting feedback is a
 *    nicety; the game is the point.
 * 2. **Never surprise the player.** Session replay exists in this SDK
 *    (`startSessionReplay`) and is deliberately never called: the player
 *    consented to product analytics, not to being recorded (D-022, D-040).
 *    Nothing leaves the browser until they type a report and press send.
 *
 * The launcher's look and position stay dashboard-owned. Passing
 * `widget_settings` here would silently override what the owner configures in
 * Userback, and the code would become the place you have to edit to move a
 * button.
 */
import UserbackWidgetLoader, { getUserback } from '@userback/widget';
import { sameUserbackIdentity, type UserbackIdentity } from './identity';

/**
 * Public by design — it identifies the Userback project, not the account, and
 * ships in the web bundle the same way the PostHog project token does. Absent
 * in a build that has not set it, which turns the whole feature off rather
 * than half-loading it.
 */
const token = process.env.EXPO_PUBLIC_USERBACK_TOKEN;

/** Lets the UI hide the "Send feedback" entry instead of offering a dead one. */
export const isUserbackConfigured = Boolean(token);

/** What the app wants the widget to know, and what it has actually been told. */
let desired: UserbackIdentity | null = null;
let applied: UserbackIdentity | null = null;
/** A load is in flight; it re-reconciles on completion rather than racing. */
let loading = false;
let launcherVisible = true;

/**
 * Points the widget at the current player. Safe to call on every render pass:
 * the first call loads the widget, later ones are a no-op unless the player
 * actually changed.
 *
 * `App.tsx` calls this only once auth has resolved, so a restored session is
 * attached to the very first report rather than arriving a beat later.
 */
export function syncUserback(identity: UserbackIdentity | null): void {
  if (!token) return;
  desired = identity;
  void reconcile();
}

/** Opens the feedback form directly — the drawer's "Send feedback" entry. */
export function openUserback(): void {
  const widget = getUserback();
  if (!widget) return;
  call(() => widget.open());
}

/**
 * Hides the floating launcher while a round is playing.
 *
 * Same reason the top bar and drawer disappear there: the game screen owns the
 * whole viewport, and a button floating over a live board is a mis-tap waiting
 * to happen.
 */
export function setUserbackLauncherVisible(visible: boolean): void {
  launcherVisible = visible;
  applyLauncher();
}

/**
 * Drives the widget towards `desired` in one place, because the two things
 * that change it — the widget finishing loading and the player signing in or
 * out — can happen in either order.
 */
async function reconcile(): Promise<void> {
  if (!token || loading) return;

  const widget = getUserback();
  if (!widget) {
    // First load. The identity goes in as `user_data` rather than through a
    // follow-up `identify()` so the widget is never briefly anonymous.
    const wanted = desired;
    loading = true;
    try {
      await UserbackWidgetLoader(token, { user_data: wanted ?? undefined });
      applied = wanted;
    } catch {
      // Blocked, offline, or a bad token. Not retried: a widget that failed to
      // load is a missing button, and retrying it in a loop would be worse
      // than that.
      return;
    } finally {
      loading = false;
    }
    applyLauncher();
    // The player may have signed in while the script was downloading.
    if (!sameUserbackIdentity(applied, desired)) void reconcile();
    return;
  }

  if (sameUserbackIdentity(applied, desired)) return;

  const next = desired;
  if (next) {
    call(() => widget.identify(next.id, next.info));
    applied = next;
    return;
  }

  // Signed out. Userback has no "forget this user", and leaving the last
  // account attached would sign the next person's report with someone else's
  // name — so the widget is torn down and the pass below rebuilds it
  // anonymously. `destroy()` clears the SDK's own singleton, so the reload is
  // a real one.
  call(() => widget.destroy());
  applied = null;
  void reconcile();
}

function applyLauncher(): void {
  const widget = getUserback();
  if (!widget) return;
  call(() => (launcherVisible ? widget.showLauncher() : widget.hideLauncher()));
}

function call(action: () => void): void {
  try {
    action();
  } catch {
    /* see rule 1 — the game outlives the feedback button */
  }
}
