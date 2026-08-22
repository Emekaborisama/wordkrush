/**
 * Wordfall domain types. Pure data — no React, no I/O.
 *
 * The game in one sentence: trace a word across adjacent letter tiles, and the
 * word's own linguistic properties decide what kind of special tile it leaves
 * behind — which then changes the board when a later word runs through it.
 */

/**
 * The special tiles a word can leave behind.
 *
 * Each one is earned by a different property of the word that made it, so the
 * player learns to aim for a property rather than just "a long word". The
 * trigger rules live in `linguistics.ts`; the board effects in `board.ts`.
 */
export type SpecialKind =
  /** Word contained J, Q, X or Z. Clears every tile sharing its letter. */
  | 'ember'
  /** Word was 7+ letters. Clears the surrounding 3x3. */
  | 'nova'
  /** Word was 5-6 letters. Clears its row and column. */
  | 'beam'
  /** Word had a doubled letter. Clears both diagonals. */
  | 'flare';

export type Tile = {
  /**
   * Identity that survives gravity.
   *
   * The UI animates a tile falling from one cell to another, which it can only
   * do if the tile is the same object conceptually before and after. Without
   * stable ids every settle would look like the whole board being replaced.
   */
  id: number;
  /** Always a single lowercase a-z letter. */
  letter: string;
  special: SpecialKind | null;
  /**
   * Crates cannot be traced through. They break when a tile next to them
   * clears, which is what makes "clear the crates" a puzzle about where you
   * play rather than what you spell.
   */
  crate: boolean;
};

/**
 * The grid.
 *
 * Row-major and flat rather than nested arrays: every rule here is expressed in
 * terms of neighbours and columns, and a flat array with an index makes both
 * the reducer and the persisted shape simpler to reason about.
 *
 * Row 0 is the TOP. Gravity moves tiles toward higher row numbers.
 */
export type Board = {
  width: number;
  height: number;
  /** Length is always width * height. Index = row * width + col. */
  tiles: Tile[];
};

/**
 * What a level asks for.
 *
 * A score target alone makes every level the same level. These give each one a
 * different question: where to play, not just what to spell.
 */
export type Objective =
  /** Reach a score. */
  | { kind: 'score'; target: number }
  /** Form N words of any length. */
  | { kind: 'words'; target: number }
  /** Clear N tiles of a given letter — the "5 words with Q" idea, generalised. */
  | { kind: 'letter'; letter: string; target: number }
  /** Break N crates. */
  | { kind: 'crates'; target: number }
  /** Form N words of at least `minLength` letters. */
  | { kind: 'length'; minLength: number; target: number };

export type Level = {
  number: number;
  name: string;
  /** Short player-facing brief shown before the level starts. */
  description: string;
  /** Moves are the currency; every submitted word spends one. */
  moves: number;
  /**
   * How long the player has, in milliseconds. Omitted on untimed levels.
   *
   * Optional on purpose: a clock and a move budget constrain the same turn from
   * two directions, and a level carrying both makes one of them decoration —
   * whichever is tighter decides every run and the other never speaks. So a
   * level is a puzzle (moves) or a race (clock), not a muddle of the two.
   *
   * Note this is only the LIMIT. Elapsed time is tracked on every level,
   * because how long a level took is worth knowing even when nothing was
   * riding on it.
   */
  timeLimitMs?: number;
  objectives: Objective[];
  /** How many crates to seed on the starting board. */
  crates: number;
  /**
   * Local calendar day the level becomes playable (`YYYY-MM-DD`).
   *
   * Omitted on the launch curriculum, which is available immediately and
   * unlocks by beating the previous level. Weekly drops set this to the Monday
   * they go live. The date is compared in the player's local timezone so a
   * drop does not appear Sunday evening in one country and Monday morning in
   * another. Still bundled — no network fetch (D-004, D-027).
   */
  availableFrom?: string;
};

/** Why a traced selection could not be played. */
export type PlayRejection =
  | { kind: 'too-short'; word: string; minLength: number }
  | { kind: 'not-a-word'; word: string }
  | { kind: 'already-played'; word: string };

/** The outcome of one successful word, and everything the UI wants to celebrate. */
export type PlayResult = {
  word: string;
  /** Points added, after rarity and chain multipliers. */
  points: number;
  /** 0 = everyday word, 1 = rare. */
  rarity: number;
  /** The special this word earned, and the tile index it was left on. */
  created: { kind: SpecialKind; index: number } | null;
  /** Specials that fired, in the order they went off. */
  triggered: SpecialKind[];
  /** Board indices removed, including everything the chain reaction took. */
  cleared: number[];
  /** Crates broken by this play. */
  cratesBroken: number;
  /**
   * How many rounds the chain reaction ran. 1 = the word alone, 2 = the word
   * set off a special, 3 = that special set off another, and so on.
   */
  chain: number;
};

export type WordfallState = {
  levelNumber: number;
  board: Board;
  /** Advances with every refill, so a run is reproducible from its first seed. */
  seed: number;
  movesLeft: number;
  /**
   * Time spent on this level so far.
   *
   * Stored rather than derived from a start timestamp, so that leaving the
   * screen and coming back does not charge the player for the time the app was
   * closed. The engine never reads a clock itself — the UI reports elapsed time
   * through a `tick` action, which is what keeps the reducer pure and lets a
   * test run a whole minute in a single dispatch.
   */
  elapsedMs: number;
  score: number;
  /** Index-aligned with the level's objectives. */
  progress: number[];
  status: 'playing' | 'won' | 'lost';
  /**
   * Board indices the player is currently tracing, in order. Lives in state
   * rather than the UI so that adjacency and no-reuse are engine rules with
   * tests, not view logic.
   */
  selection: number[];
  /** The last word played, for the UI to animate. Cleared on the next trace. */
  lastPlay: PlayResult | null;
  /** Why the last submission bounced. Cleared when the player starts tracing. */
  rejection: PlayRejection | null;
  /** Words already used this level — each may only be scored once. */
  played: string[];
  /** Monotonic id source for newly spawned tiles. */
  nextTileId: number;
};

export const BOARD_WIDTH = 7;
export const BOARD_HEIGHT = 8;
