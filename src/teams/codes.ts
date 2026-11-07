import { SITE_URL } from '../games/share-data';

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

/**
 * The link a player sends to bring a friend onto their team. Always the
 * public https address: a `wordkrush://` link is not a link in a chat app or
 * a social post, and a friend without the app could not open it anyway. The
 * app reads `/team/CODE` back through `parseTeamInviteUrl`, and the server
 * gives it its own preview card.
 */
export function teamInviteUrl(code: string): string {
  return `${SITE_URL}/team/${normalizeInviteCode(code)}`;
}
