/**
 * Web-only history adapter. Native has a system back stack and ignores this.
 *
 * There is no router. Each in-app screen pushes one history entry on the
 * current URL. A pop moves to `parentOf` instead of leaving the site. The hub
 * does not push, so Back from the hub can still leave.
 */
import { Platform } from 'react-native';

const MARKER = { wordkrush: true };

let popped = false;

/** True once, after a pop the app just handled. The next push must be skipped. */
export function consumeWebHistoryPop(): boolean {
  if (!popped) return false;
  popped = false;
  return true;
}

export function installWebHistory(onBack: () => boolean): () => void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return () => {};
  if (!window.history.state || window.history.state.wordkrush !== true) {
    window.history.replaceState(MARKER, '');
  }
  const onPop = () => {
    const handled = onBack();
    if (handled) popped = true;
  };
  window.addEventListener('popstate', onPop);
  return () => window.removeEventListener('popstate', onPop);
}

/** Record a forward navigation. No-op on native and on the pop that caused it. */
export function noteWebNavigation(atRoot: boolean): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if (consumeWebHistoryPop()) return;
  if (atRoot) return;
  window.history.pushState(MARKER, '');
}

/** The shareable address of I Sabi Lagos. */
export const LAGOS_PATH = '/isabilagos';

/** True when the page was opened at `/isabilagos` (web only). */
export function openedAtLagosPath(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return window.location.pathname.replace(/\/+$/, '').toLowerCase() === LAGOS_PATH;
}

/**
 * Keeps the address bar on `/isabilagos` while a player is in I Sabi Lagos,
 * so the URL they copy opens it, and back on `/` once they leave. Replaces
 * the current entry rather than adding one: history depth stays the app's.
 */
export function syncLagosPath(inLagos: boolean): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const atLagos = window.location.pathname.replace(/\/+$/, '').toLowerCase() === LAGOS_PATH;
  if (inLagos === atLagos) return;
  window.history.replaceState(window.history.state, '', inLagos ? LAGOS_PATH : '/');
}
