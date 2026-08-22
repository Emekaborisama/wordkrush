/**
 * Validation for resumed Wordfall sessions.
 *
 * Kept out of the engine so that stays pure and unit-testable, and so the shape
 * check lives next to the type it guards rather than inside a screen.
 *
 * A Wordfall save is a whole board, which makes it the largest and most
 * structured state in the app — and the easiest to half-write. Every tile is
 * checked, because one malformed entry would surface much later as a blank cell
 * the player cannot trace through.
 */
import type { Board, SpecialKind, Tile, WordfallState } from './types';

const SPECIALS: SpecialKind[] = ['ember', 'nova', 'beam', 'flare'];

function isTile(value: unknown): value is Tile {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === 'number' &&
    Number.isInteger(t.id) &&
    typeof t.letter === 'string' &&
    /^[a-z]$/.test(t.letter) &&
    typeof t.crate === 'boolean' &&
    (t.special === null || SPECIALS.includes(t.special as SpecialKind))
  );
}

function isBoard(value: unknown): value is Board {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  if (!Number.isInteger(b.width) || !Number.isInteger(b.height)) return false;
  const width = b.width as number;
  const height = b.height as number;
  if (width <= 0 || height <= 0) return false;
  if (!Array.isArray(b.tiles)) return false;
  // A board whose tile count disagrees with its dimensions would index out of
  // bounds on the first neighbour lookup.
  return b.tiles.length === width * height && b.tiles.every(isTile);
}

export function isWordfallState(value: unknown): value is WordfallState {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  if (!isBoard(s.board)) return false;

  const board = s.board as Board;
  const isIndex = (i: unknown) =>
    typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < board.tiles.length;

  return (
    Number.isInteger(s.levelNumber) &&
    typeof s.seed === 'number' &&
    Number.isInteger(s.movesLeft) &&
    (s.movesLeft as number) >= 0 &&
    // A negative or non-finite elapsed time would resume the level with a clock
    // that can never run out.
    typeof s.elapsedMs === 'number' &&
    Number.isFinite(s.elapsedMs) &&
    (s.elapsedMs as number) >= 0 &&
    typeof s.score === 'number' &&
    (s.score as number) >= 0 &&
    Array.isArray(s.progress) &&
    s.progress.every((p) => typeof p === 'number') &&
    (s.status === 'playing' || s.status === 'won' || s.status === 'lost') &&
    Array.isArray(s.selection) &&
    s.selection.every(isIndex) &&
    Array.isArray(s.played) &&
    s.played.every((w) => typeof w === 'string') &&
    Number.isInteger(s.nextTileId)
  );
}

/**
 * Restore a saved session into a clean state.
 *
 * Three deliberate resets: a half-finished trace is dropped (resuming mid-drag
 * would leave tiles lit with no finger on them), and the last result and any
 * pending rejection are cleared so the board does not replay an old
 * celebration or a stale error every time the screen is opened.
 */
export function rehydrate(state: WordfallState): WordfallState {
  return { ...state, selection: [], lastPlay: null, rejection: null };
}

/**
 * Everything Wordfall remembers between sessions.
 *
 * Progression and the live board are saved together rather than under separate
 * keys, because they can disagree: a save holding "level 5 unlocked" next to a
 * half-played level 3 is coherent, but two independent writes can tear and
 * leave a player unlocked into a level whose board never loaded.
 */
export type WordfallSave = {
  /** Highest level the player may open. Always at least 1. */
  unlocked: number;
  /** The level in progress, or null if there is nothing to resume. */
  state: WordfallState | null;
};

export function isWordfallSave(value: unknown): value is WordfallSave {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  if (!Number.isInteger(s.unlocked) || (s.unlocked as number) < 1) return false;
  return s.state === null || isWordfallState(s.state);
}
