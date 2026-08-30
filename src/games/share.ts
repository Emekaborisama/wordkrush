/**
 * Framing shared by every game's result paste.
 *
 * Per-game formatters own the grid and the standing; this module owns the
 * URL and the line order so a Clueless paste and a Wordfall paste land in
 * the same shape. The URL carries `utm_medium=share` so arrivals resolve to
 * `entry_source: 'share'` in `src/analytics/attribution.ts`.
 */

export const SHARE_URL = 'https://wordkrush.com/?utm_source=player&utm_medium=share';

export const SHARE_SQUARES_PER_ROW = 10;

/**
 * Longest run this will draw square-by-square. Past it the grid stops being
 * readable in a chat and the number in the standing carries the story.
 */
export const SHARE_MAX_SQUARES = 50;

export type ShareBlocks = {
  title: string;
  grid: string;
  standing: string;
  verdict?: string;
  url?: string;
};

export function composeShare(blocks: ShareBlocks): string {
  const lines = [blocks.title];
  if (blocks.grid.length > 0) lines.push(blocks.grid);
  lines.push(blocks.standing);
  if (blocks.verdict !== undefined && blocks.verdict.length > 0) {
    lines.push(blocks.verdict);
  }
  lines.push(blocks.url ?? SHARE_URL);
  return lines.join('\n');
}

/**
 * Wrap a string of emoji squares into rows of ten.
 *
 * Uses `[...squares]` so each emoji is one cell — they are outside the BMP
 * and a naive `length` / `slice` would split code units.
 */
export function wrapSquares(
  squares: string,
  overflowLabel?: (extra: number) => string,
): string {
  const cells = [...squares];
  const kept = cells.slice(0, SHARE_MAX_SQUARES);
  const extra = cells.length - kept.length;
  const rows: string[] = [];
  for (let i = 0; i < kept.length; i += SHARE_SQUARES_PER_ROW) {
    rows.push(kept.slice(i, i + SHARE_SQUARES_PER_ROW).join(''));
  }
  if (extra > 0) {
    rows.push(overflowLabel !== undefined ? overflowLabel(extra) : `+${extra} more`);
  }
  return rows.join('\n');
}
