/**
 * Team invite codes. Alphabet drops 0/O/1/I so a code read aloud still types.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isInviteCode(value: string): boolean {
  const code = normalizeInviteCode(value);
  return code.length === 6 && [...code].every((ch) => ALPHABET.includes(ch));
}

export function parseTeamInviteUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const fromQuery = parsed.searchParams.get('code') ?? parsed.searchParams.get('team');
    if (fromQuery && isInviteCode(fromQuery)) return normalizeInviteCode(fromQuery);
    const host = parsed.hostname.replace(/^www\./, '');
    if (parsed.protocol === 'wordkrush:' && (host === 'team' || parsed.pathname.startsWith('//team'))) {
      const pathCode = parsed.pathname.replace(/^\/\/?team\/?/, '').replace(/^\//, '');
      if (pathCode && isInviteCode(pathCode)) return normalizeInviteCode(pathCode);
    }
    const pathMatch = parsed.pathname.match(/\/team\/([A-Za-z0-9]+)/);
    if (pathMatch && isInviteCode(pathMatch[1])) return normalizeInviteCode(pathMatch[1]);
    return null;
  } catch {
    return null;
  }
}

export function teamInviteUrl(code: string, webOrigin?: string): string {
  const normalized = normalizeInviteCode(code);
  if (webOrigin) {
    const origin = webOrigin.replace(/\/$/, '');
    return `${origin}/?team=${normalized}`;
  }
  return `wordkrush://team?code=${normalized}`;
}
