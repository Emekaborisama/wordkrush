/**
 * Pure parsing of the URL Supabase redirects to after a magic-link click.
 * Kept free of React, Linking, and the client so the cases can be unit tested.
 */

export type AuthCallbackParams = {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
};

export function parseAuthCallbackUrl(url: string): AuthCallbackParams {
  const query = paramsAfter(url, '?');
  const hash = paramsAfter(url, '#');
  return {
    code: nonempty(query.get('code') ?? hash.get('code')),
    accessToken: nonempty(hash.get('access_token') ?? query.get('access_token')),
    refreshToken: nonempty(hash.get('refresh_token') ?? query.get('refresh_token')),
  };
}

export function isAuthCallbackUrl(url: string): boolean {
  const params = parseAuthCallbackUrl(url);
  return Boolean(params.code || (params.accessToken && params.refreshToken));
}

function paramsAfter(url: string, delimiter: '?' | '#'): URLSearchParams {
  const start = url.indexOf(delimiter);
  if (start < 0) return new URLSearchParams();
  const rest = url.slice(start + 1);
  const cut = delimiter === '?' ? rest.indexOf('#') : -1;
  return new URLSearchParams(cut >= 0 ? rest.slice(0, cut) : rest);
}

function nonempty(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.length > 0 ? value : null;
}
