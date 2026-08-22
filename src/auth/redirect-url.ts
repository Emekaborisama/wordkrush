/**
 * Web magic-link callback. Must be an absolute URL with a scheme.
 *
 * GoTrue treats a bare host (`wordkrush.com`) as a path on the Auth API
 * host, so the player lands on
 * `https://<project>.supabase.co/wordkrush.com` (`requested path is invalid`).
 * Web uses the origin only (no `/auth/callback` suffix) so the request
 * matches Site URL even when the dashboard allow-list is exact, not `/**`.
 */
export function webAuthRedirectUrl(origin: string): string {
  const trimmed = origin.trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed.replace(/^\/+/, '')}`;
}
