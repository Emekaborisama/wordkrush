/**
 * Share data encoding for per-result Open Graph previews.
 *
 * Encodes game result metadata into a URL-safe string that the server can
 * decode to generate a spoiler-free 1200×630 OG image. Never includes answers,
 * guessed words, or item labels — only aggregate stats.
 */

export type GameId = 'more-or-less' | 'clueless' | 'wordfall';

export type MoreOrLessShareData = {
  game: 'more-or-less';
  streak: number;
  bestStreak: number;
  /**
   * The two photos this share's card draws, as `CARD_PHOTO_IDS` entries.
   *
   * The card art used to be picked by hashing the encoded token, which made it
   * a property of how the link was spelled rather than of the share: the same
   * result reached one scraper padded and the next unpadded, and the two drew
   * different boards. Naming the pair in the payload settles it once, at the
   * moment the player shares.
   *
   * Optional because links shared before 0.8.35 do not carry it; the server
   * derives a stable pair for those from the decoded payload.
   */
  photos?: [string, string];
};

export type CluelessShareData = {
  game: 'clueless';
  puzzleNumber: number;
  levelName?: string;
  guessCount: number;
  heatBuckets: {
    unranked: number;
    cold: number;
    top_100: number;
    top_10: number;
    win: number;
  };
};

export type WordfallShareData = {
  game: 'wordfall';
  levelNumber: number;
  levelName: string;
  score: number;
  wordCount: number;
  lengthBuckets: {
    under_3: number;
    '3_4': number;
    '5_7': number;
    '8_plus': number;
  };
  won: boolean;
};

export type ShareData = MoreOrLessShareData | CluelessShareData | WordfallShareData;

/**
 * Encode share data to an unpadded base64url token.
 *
 * UNPADDED, AND NEVER `~`. This used to map base64's `=` padding to `~` for a
 * cleaner-looking URL. `twitter-text` — the library X's own composer uses to
 * find the links in a draft — allows `~` inside a URL but not as the last
 * character of one, so roughly half of all share links reached the composer
 * with their padding, and the whole query string behind it, cut off: the paste
 * showed a bare blue link and no card. base64url's own answer to padding is to
 * drop it, which leaves a token made only of characters a URL may end on.
 *
 * Uses browser-compatible APIs (TextEncoder + btoa) instead of Node Buffer.
 */
export function encodeShareData(data: ShareData): string {
  const json = JSON.stringify(data);
  // TextEncoder is available in browsers and Node 11+
  const bytes = new TextEncoder().encode(json);
  // Convert bytes to binary string
  const binaryString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  // btoa is available in browsers; for Node (server/tests) we use global polyfill if needed
  const base64 = typeof btoa !== 'undefined' ? btoa(binaryString) : Buffer.from(json, 'utf-8').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode a share token back to share data.
 *
 * Accepts three spellings of the same payload: today's unpadded base64url, the
 * `~`-padded tokens shared before 0.8.35, and either of those with `=` padding
 * — so a link that has been in someone's timeline for a week still resolves,
 * and one that lost its tail on the way through a composer still resolves too.
 *
 * Uses browser-compatible APIs (atob + TextDecoder) instead of Node Buffer.
 */
export function decodeShareData(encoded: string): ShareData | null {
  try {
    const unpadded = encoded.replace(/-/g, '+').replace(/_/g, '/').replace(/[=~]+$/, '');
    const base64 = unpadded.padEnd(Math.ceil(unpadded.length / 4) * 4, '=');
    // atob is available in browsers; for Node (server/tests) we use global polyfill if needed
    const binaryString = typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf-8');
    // Convert binary string to bytes
    const bytes = typeof atob !== 'undefined' 
      ? Uint8Array.from(binaryString, (char) => char.charCodeAt(0))
      : new TextEncoder().encode(binaryString);
    // TextDecoder is available in browsers and Node 11+
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json) as ShareData;

    // Validate structure
    if (!data || typeof data !== 'object' || !('game' in data)) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Build a share URL with encoded game result data.
 */
export function buildShareUrl(data: ShareData): string {
  const encoded = encodeShareData(data);
  return `https://wordkrush.com/share/${encoded}?utm_source=player&utm_medium=share`;
}
