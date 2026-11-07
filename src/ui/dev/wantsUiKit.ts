/**
 * True on a dev web build opened with `?kit`. Kept apart from the kit page so
 * the app entry can ask without importing it: production never loads the page.
 */
export function wantsUiKit(): boolean {
  if (!__DEV__) return false;
  if (typeof window === 'undefined' || !window.location) return false;
  return /[?&]kit\b/.test(window.location.search ?? '');
}
