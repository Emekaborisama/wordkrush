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
 * Encode share data to a URL-safe base64 string.
 */
export function encodeShareData(data: ShareData): string {
  const json = JSON.stringify(data);
  const base64 = Buffer.from(json, 'utf-8').toString('base64');
  // Make it URL-safe: replace +/= with -_~ for cleaner URLs
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '~');
}

/**
 * Decode a URL-safe base64 string back to share data.
 */
export function decodeShareData(encoded: string): ShareData | null {
  try {
    // Restore base64 padding and characters
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/').replace(/~/g, '=');
    const json = Buffer.from(base64, 'base64').toString('utf-8');
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
