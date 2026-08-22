/**
 * Board mechanics — generation, tracing, special-tile effects, gravity.
 *
 * Everything here is a pure function of its arguments plus a seed. Nothing
 * calls Math.random, so a whole run replays exactly from its first seed, which
 * is what makes the chain-reaction logic testable at all: "this board, this
 * word, these tiles cleared" is a fact, not a coin flip.
 */
import { nextInt, nextRandom } from '../rng';
import type { Dictionary } from './dictionary';
import type { Board, Level, SpecialKind, Tile } from './types';

export const at = (board: Board, row: number, col: number): Tile | undefined =>
  board.tiles[row * board.width + col];

export const rowOf = (board: Board, index: number): number => Math.floor(index / board.width);
export const colOf = (board: Board, index: number): number => index % board.width;
export const indexAt = (board: Board, row: number, col: number): number => row * board.width + col;

const inBounds = (board: Board, row: number, col: number): boolean =>
  row >= 0 && row < board.height && col >= 0 && col < board.width;

/**
 * The eight cells touching this one.
 *
 * Eight-way rather than four-way adjacency, as in Boggle. Four-way looks
 * tidier but strangles the board: most five-letter words need a diagonal
 * somewhere, and without them the player stares at a grid full of letters that
 * cannot be joined.
 */
export function neighbors(board: Board, index: number): number[] {
  const row = rowOf(board, index);
  const col = colOf(board, index);
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      if (inBounds(board, row + dr, col + dc)) out.push(indexAt(board, row + dr, col + dc));
    }
  }
  return out;
}

/**
 * The four cells sharing an edge with this one.
 *
 * Crates break by orthogonal contact only. Eight-way would mean a clear three
 * cells away diagonally still popped a crate, which players read as the game
 * being loose with its own rules rather than as generosity.
 */
export function orthogonalNeighbors(board: Board, index: number): number[] {
  const row = rowOf(board, index);
  const col = colOf(board, index);
  const out: number[] = [];
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    if (inBounds(board, row + dr, col + dc)) out.push(indexAt(board, row + dr, col + dc));
  }
  return out;
}

export function areAdjacent(board: Board, a: number, b: number): boolean {
  if (a === b) return false;
  const dr = Math.abs(rowOf(board, a) - rowOf(board, b));
  const dc = Math.abs(colOf(board, a) - colOf(board, b));
  return dr <= 1 && dc <= 1;
}

/* -------------------------------------------------------------------------- */
/* Letter supply                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A weighted letter source built from the dictionary's measured distribution.
 *
 * Cumulative weights so a pick is one binary search rather than a scan. Built
 * once and passed around, because rebuilding it per spawned tile would be the
 * hottest waste in the game.
 */
export type LetterBag = {
  letters: string[];
  cumulative: number[];
  total: number;
};

export function createLetterBag(weights: ReadonlyArray<readonly [string, number]>): LetterBag {
  const letters: string[] = [];
  const cumulative: number[] = [];
  let total = 0;
  for (const [letter, weight] of weights) {
    total += weight;
    letters.push(letter);
    cumulative.push(total);
  }
  return { letters, cumulative, total };
}

/** Returns [letter, next seed]. */
export function drawLetter(bag: LetterBag, seed: number): [string, number] {
  const [roll, next] = nextRandom(seed);
  const target = roll * bag.total;
  let lo = 0;
  let hi = bag.cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (bag.cumulative[mid] <= target) lo = mid + 1;
    else hi = mid;
  }
  return [bag.letters[lo], next];
}

/* -------------------------------------------------------------------------- */
/* Solver                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Prefix index over the EVERYDAY word list, used to certify that a board is
 * worth handing to a player.
 *
 * Two decisions matter here:
 *
 *   PREFIXES — without them, searching a 56-cell board to depth 8 is billions
 *   of paths. Abandoning a path the moment "zq" cannot begin a word turns that
 *   into milliseconds.
 *
 *   COMMON WORDS ONLY — the solver deliberately does not use the full accept
 *   list. A board whose only solutions are "aalii" and "abaft" is solvable on
 *   paper and dead in the hand, and certifying it would be lying to the player.
 */
export type Solver = {
  words: Set<string>;
  prefixes: Set<string>;
  maxLength: number;
};

export function createSolver(dictionary: Dictionary): Solver {
  const words = new Set<string>();
  const prefixes = new Set<string>();
  for (const word of dictionary.commonWords) {
    words.add(word);
    for (let i = 1; i < word.length; i++) prefixes.add(word.slice(0, i));
  }
  return { words, prefixes, maxLength: dictionary.maxLength };
}

/**
 * Finds words traceable on the board, stopping once `limit` distinct words are
 * known.
 *
 * The early exit is the point: board generation only ever asks "are there
 * enough?", never "what are they all?", and exhaustively solving every
 * candidate board would make level start visibly slow.
 */
export function findWords(board: Board, solver: Solver, limit = Infinity): string[] {
  const found = new Set<string>();
  const visited = new Array<boolean>(board.tiles.length).fill(false);

  const walk = (index: number, prefix: string): boolean => {
    const tile = board.tiles[index];
    // Crates are walls, not letters — a path cannot pass through one.
    if (tile.crate) return false;

    const word = prefix + tile.letter;
    if (word.length > solver.maxLength) return false;
    // A dead prefix prunes the entire subtree below it.
    if (word.length > 1 && !solver.prefixes.has(word) && !solver.words.has(word)) return false;

    visited[index] = true;
    if (word.length >= 3 && solver.words.has(word)) {
      found.add(word);
      if (found.size >= limit) {
        visited[index] = false;
        return true;
      }
    }
    if (solver.prefixes.has(word)) {
      for (const n of neighbors(board, index)) {
        if (!visited[n] && walk(n, word)) {
          visited[index] = false;
          return true;
        }
      }
    }
    visited[index] = false;
    return false;
  };

  for (let i = 0; i < board.tiles.length; i++) {
    if (walk(i, '')) break;
  }
  return [...found];
}

/** Cheap "is this board dead?" check — the only question the engine asks mid-run. */
export function isPlayable(board: Board, solver: Solver): boolean {
  return findWords(board, solver, 1).length > 0;
}

/* -------------------------------------------------------------------------- */
/* Generation                                                                 */
/* -------------------------------------------------------------------------- */

/** A board must offer at least this many everyday words to be handed over. */
const MIN_OPENING_WORDS = 10;
/** Give up re-rolling after this many tries and ship the best board seen. */
const MAX_ATTEMPTS = 24;

export type Generated = { board: Board; seed: number; nextTileId: number };

function fill(
  width: number,
  height: number,
  bag: LetterBag,
  seed: number,
  firstId: number,
): Generated {
  const tiles: Tile[] = [];
  let s = seed;
  let id = firstId;
  for (let i = 0; i < width * height; i++) {
    const [letter, next] = drawLetter(bag, s);
    s = next;
    tiles.push({ id: id++, letter, special: null, crate: false });
  }
  return { board: { width, height, tiles }, seed: s, nextTileId: id };
}

/**
 * Scatters crates across the board.
 *
 * Kept off the bottom row: a crate that starts at the floor can only be reached
 * by clearing the column above it, which reads as bad luck rather than a
 * puzzle. Everything else is fair game.
 */
function addCrates(board: Board, count: number, seed: number): { board: Board; seed: number } {
  const tiles = board.tiles.map((t) => ({ ...t }));
  const placeable = board.height - 1;
  let s = seed;
  let placed = 0;
  let guard = count * 20;

  while (placed < count && guard-- > 0) {
    const [row, s1] = nextInt(s, placeable);
    const [col, s2] = nextInt(s1, board.width);
    s = s2;
    const index = row * board.width + col;
    if (tiles[index].crate) continue;
    tiles[index] = { ...tiles[index], crate: true };
    placed++;
  }
  return { board: { ...board, tiles }, seed: s };
}

/**
 * Builds a starting board that is actually worth playing.
 *
 * Random letters from a realistic distribution still produce duds — a grid can
 * be perfectly plausible and contain almost nothing. So boards are re-rolled
 * until one offers enough words, and the best-scoring attempt is kept if none
 * clears the bar. It never loops forever and never returns a dead board: a
 * player who opens a level to an unplayable grid does not open it twice.
 */
export function generateBoard(
  level: Level,
  bag: LetterBag,
  solver: Solver,
  seed: number,
  width: number,
  height: number,
): Generated {
  let s = seed;
  let best: Generated | null = null;
  let bestCount = -1;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const filled = fill(width, height, bag, s, best?.nextTileId ?? 1);
    const crated = addCrates(filled.board, level.crates, filled.seed);
    s = crated.seed;

    const count = findWords(crated.board, solver, MIN_OPENING_WORDS).length;
    const candidate: Generated = {
      board: crated.board,
      seed: s,
      nextTileId: filled.nextTileId,
    };
    if (count >= MIN_OPENING_WORDS) return candidate;
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }

  // Unreachable in practice with a measured letter distribution, but the
  // fallback is a real board rather than a throw: failing to find a *great*
  // board is not a reason to refuse to start the level.
  return best!;
}

/* -------------------------------------------------------------------------- */
/* Special tile effects                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The tiles a special takes with it when it goes off.
 *
 * Each shape is visually distinct on purpose — a plus, a block, a cross, a
 * scatter — so a player who sees the aftermath can tell which special fired
 * without reading anything.
 */
export function effectArea(board: Board, index: number, kind: SpecialKind): number[] {
  const row = rowOf(board, index);
  const col = colOf(board, index);
  const out: number[] = [];

  switch (kind) {
    case 'beam': {
      for (let c = 0; c < board.width; c++) out.push(indexAt(board, row, c));
      for (let r = 0; r < board.height; r++) if (r !== row) out.push(indexAt(board, r, col));
      break;
    }
    case 'nova': {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (inBounds(board, row + dr, col + dc)) out.push(indexAt(board, row + dr, col + dc));
        }
      }
      break;
    }
    case 'flare': {
      for (let d = -Math.max(board.width, board.height); d <= board.width; d++) {
        if (inBounds(board, row + d, col + d)) out.push(indexAt(board, row + d, col + d));
        if (inBounds(board, row + d, col - d)) out.push(indexAt(board, row + d, col - d));
      }
      break;
    }
    case 'ember': {
      // Every tile sharing this one's letter, wherever it is. The only effect
      // that ignores geometry, which is what makes it feel like a different
      // kind of power rather than a bigger blast radius.
      const letter = board.tiles[index].letter;
      for (let i = 0; i < board.tiles.length; i++) {
        if (board.tiles[i].letter === letter) out.push(i);
      }
      break;
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Gravity and refill                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Drops surviving tiles and refills from the top.
 *
 * Survivors keep their ids so the UI can animate the fall; only genuinely new
 * tiles get new ids. Columns are handled independently, which is what makes the
 * board settle the way players expect from every match-3 they have played.
 */
export function settle(
  board: Board,
  cleared: ReadonlySet<number>,
  bag: LetterBag,
  seed: number,
  nextTileId: number,
): Generated {
  const tiles = new Array<Tile>(board.tiles.length);
  let s = seed;
  let id = nextTileId;

  for (let col = 0; col < board.width; col++) {
    let writeRow = board.height - 1;
    // Walk bottom-up so survivors land in the same order they were stacked.
    for (let row = board.height - 1; row >= 0; row--) {
      const index = indexAt(board, row, col);
      if (cleared.has(index)) continue;
      tiles[indexAt(board, writeRow, col)] = board.tiles[index];
      writeRow--;
    }
    // Everything above the settled stack is new.
    for (let row = writeRow; row >= 0; row--) {
      const [letter, next] = drawLetter(bag, s);
      s = next;
      tiles[indexAt(board, row, col)] = { id: id++, letter, special: null, crate: false };
    }
  }

  return { board: { ...board, tiles }, seed: s, nextTileId: id };
}

/**
 * Reassigns every letter on the board, keeping crates and specials where they
 * are.
 *
 * The rescue hatch for a dead board. Preserving specials matters: losing a nova
 * the player had been saving because the board happened to stall would feel
 * like a punishment for the game's own shortcoming.
 */
export function reshuffle(board: Board, bag: LetterBag, seed: number): { board: Board; seed: number } {
  let s = seed;
  const tiles = board.tiles.map((tile) => {
    if (tile.crate) return tile;
    const [letter, next] = drawLetter(bag, s);
    s = next;
    return { ...tile, letter };
  });
  return { board: { ...board, tiles }, seed: s };
}
