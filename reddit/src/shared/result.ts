/**
 * The result block a player drops into the comments.
 *
 * Wordle's grid is the design lesson and this follows it: show the *shape* of a
 * performance, never its content. Because every player on a post gets the same
 * sequence, that rule matters more here than it does in the Expo app — a result
 * that named an item, a value, or which side won would spoil the run for
 * everyone who scrolls past afterwards.
 *
 * A square only says "the run was still alive here". It says nothing about
 * which answer was right, so a reader who has not played learns nothing they
 * could use. See GTM §5.1.
 */

const CORRECT = '🟩';
const WRONG = '🟥';
const PER_ROW = 10;

/**
 * Longest streak this will draw square-by-square. Past it the grid stops being
 * readable in a comment and the number carries the story on its own.
 */
const MAX_SQUARES = 50;

export type ShareInput = {
  /** "Sat 23 Aug" */
  dayLabel: string;
  streak: number;
  /** 1-based board position, or null when the run was not ranked. */
  rank: number | null;
  players: number;
};

function grid(streak: number): string {
  const squares = Math.min(streak, MAX_SQUARES);
  const rows: string[] = [];

  for (let i = 0; i < squares; i += PER_ROW) {
    rows.push(CORRECT.repeat(Math.min(PER_ROW, squares - i)));
  }

  if (streak > MAX_SQUARES) {
    rows.push(`+${streak - MAX_SQUARES} more ${WRONG}`);
    return rows.join('\n');
  }

  // The run always ends on a miss, so the red square closes the grid — except
  // at zero, where it is the whole grid.
  const last = rows[rows.length - 1];
  if (last !== undefined && last.length < PER_ROW * CORRECT.length) {
    rows[rows.length - 1] = last + WRONG;
  } else {
    rows.push(WRONG);
  }
  return rows.join('\n');
}

/** Spoiler-free result, ready to paste as a comment. */
export function buildShareText(input: ShareInput): string {
  const { dayLabel, streak, rank, players } = input;

  const standing =
    rank !== null && players > 0
      ? `Streak ${streak} · #${rank} of ${players} today`
      : `Streak ${streak}`;

  return `More or Less — ${dayLabel}\n${grid(streak)}\n${standing}`;
}
