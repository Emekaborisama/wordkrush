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
