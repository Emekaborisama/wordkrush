/**
 * Wordfall engine — a pure reducer, the same shape as the other two games.
 *
 * `(state, action, context) => state`. The context holds the things that are
 * expensive to build and never change during a level (dictionary, solver,
 * letter bag), exactly as Clueless passes its `PuzzleIndex`.
 *
 * The reducer owns the player's in-progress trace as well as the board. That is
 * deliberate: adjacency, no-reuse and backtracking are game RULES, and rules
 * that live in a gesture handler cannot be tested and quietly differ between
 * touch and mouse.
 */
import {
  areAdjacent,
  createLetterBag,
  createSolver,
  effectArea,
  generateBoard,
  isPlayable,
  orthogonalNeighbors,
  reshuffle,
  settle,
  type LetterBag,
  type Solver,
} from './board';
import type { Dictionary } from './dictionary';
import { analyze, letterValues, scoreWord, specialFor } from './linguistics';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  type Board,
  type Level,
  type Objective,
  type PlayResult,
  type SpecialKind,
  type WordfallState,
} from './types';

export type Action =
  /** Extend, backtrack, or begin a trace at this board index. */
  | { type: 'trace'; index: number }
  /** Abandon the current trace without spending a move. */
  | { type: 'cancel' }
  /** Play the traced word. */
  | { type: 'submit' }
  /**
   * Report how long the player has been on this level.
   *
   * Absolute elapsed time, not a delta: deltas accumulate drift and go wrong
   * whenever the app is backgrounded, whereas an absolute value re-derived from
   * a start timestamp is self-correcting.
   */
  | { type: 'tick'; elapsedMs: number }
  /** Start this level again from a fresh seed. */
  | { type: 'restart'; seed: number }
  /** Replace state wholesale when resuming a saved session. */
  | { type: 'restore'; state: WordfallState };

/**
 * Everything a level needs that is not state. Built once per level and passed
 * into every dispatch, so the reducer stays a pure function of its arguments.
 */
export type WordfallContext = {
  level: Level;
  dictionary: Dictionary;
  solver: Solver;
  bag: LetterBag;
  letterValue: (letter: string) => number;
};

export function createContext(level: Level, dictionary: Dictionary): WordfallContext {
  const values = letterValues(dictionary.letterWeights);
  return {
    level,
    dictionary,
    solver: createSolver(dictionary),
    bag: createLetterBag(dictionary.letterWeights),
    // Unknown letters cannot occur — the bag only ever deals letters that have
    // a weight — but scoring should not be the thing that crashes if they do.
    letterValue: (letter: string) => values.get(letter) ?? 1,
  };
}

export function newGame(ctx: WordfallContext, seed: number): WordfallState {
  const generated = generateBoard(
    ctx.level,
    ctx.bag,
    ctx.solver,
    seed,
    BOARD_WIDTH,
    BOARD_HEIGHT,
  );
  return {
    levelNumber: ctx.level.number,
    board: generated.board,
    seed: generated.seed,
    movesLeft: ctx.level.moves,
    elapsedMs: 0,
    score: 0,
    progress: ctx.level.objectives.map(() => 0),
    status: 'playing',
    selection: [],
    lastPlay: null,
    rejection: null,
    played: [],
    nextTileId: generated.nextTileId,
  };
}

/** The word the current trace spells. */
export function tracedWord(state: WordfallState): string {
  return state.selection.map((i) => state.board.tiles[i].letter).join('');
}

/** Milliseconds left on the clock, or null on an untimed level. */
export function timeLeftMs(state: WordfallState, ctx: WordfallContext): number | null {
  const limit = ctx.level.timeLimitMs;
  if (limit === undefined) return null;
  return Math.max(0, limit - state.elapsedMs);
}

/**
 * Whether the clock ended the level, rather than the move budget.
 *
 * Derived rather than stored: the facts that decide it are already in state,
 * and a separate `lostBecause` field would be one more thing that can drift out
 * of agreement with them.
 */
export function lostToClock(state: WordfallState, ctx: WordfallContext): boolean {
  return state.status === 'lost' && timeLeftMs(state, ctx) === 0;
}

export function objectiveMet(objective: Objective, progress: number): boolean {
  return progress >= objective.target;
}

export function allObjectivesMet(ctx: WordfallContext, progress: number[]): boolean {
  return ctx.level.objectives.every((o, i) => objectiveMet(o, progress[i] ?? 0));
}

/**
 * Runs the chain reaction.
 *
 * The rule that makes the whole mechanic work: the LAST tile of the word keeps
 * its letter and receives the new special, while the rest of the word clears.
 * That is why a special sits in the middle of the board waiting to be used
 * again, rather than vanishing with the word that earned it.
 *
 * A special already sitting on that last tile still fires before being replaced.
 * Overwriting it silently would mean ending a word on your own nova quietly
 * threw it away — a punishment for a move that looks clever.
 */
function resolvePlay(
  board: Board,
  selection: number[],
  createdKind: SpecialKind | null,
): { cleared: Set<number>; triggered: SpecialKind[]; chain: number } {
  const anchor = selection[selection.length - 1];
  const anchorSurvives = createdKind !== null;

  const cleared = new Set<number>();
  const triggered: SpecialKind[] = [];
  let wave: number[] = [];

  for (const index of selection) {
    const hasSpecial = board.tiles[index].special !== null;
    if (index === anchor && anchorSurvives) {
      if (hasSpecial) wave.push(index);
      continue;
    }
    cleared.add(index);
    if (hasSpecial) wave.push(index);
  }

  let chain = 1;
  while (wave.length > 0) {
    chain++;
    const next: number[] = [];
    for (const index of wave) {
      const kind = board.tiles[index].special;
      if (!kind) continue;
      triggered.push(kind);
      for (const target of effectArea(board, index, kind)) {
        // The anchor is protected for the whole cascade, or a beam it set off
        // could clear the very tile that was about to hold the new special.
        if (target === anchor && anchorSurvives) continue;
        if (cleared.has(target)) continue;
        // Crates are broken by contact, below — a blast does not consume them
        // as if they were letters.
        if (board.tiles[target].crate) continue;
        cleared.add(target);
        if (board.tiles[target].special) next.push(target);
      }
    }
    wave = next;
  }

  return { cleared, triggered, chain };
}

/** Crates touching anything that cleared. */
function breakCrates(board: Board, cleared: ReadonlySet<number>): number[] {
  const broken = new Set<number>();
  for (const index of cleared) {
    for (const n of orthogonalNeighbors(board, index)) {
      if (board.tiles[n].crate) broken.add(n);
    }
  }
  return [...broken];
}

/**
 * Points for one play.
 *
 * The word's own value comes from `scoreWord`. Everything added here is about
 * the CONSEQUENCES of the move — how much board it took with it, and how many
 * times the reaction bounced — because that is the part a match-3 player is
 * actually chasing.
 */
function pointsFor(
  wordScore: number,
  clearedCount: number,
  wordLength: number,
  chain: number,
): number {
  const chainMultiplier = 1 + (chain - 1) * 0.5;
  // Only tiles beyond the word itself count, so a plain three-letter word does
  // not collect a "bonus" for clearing its own letters.
  const collateral = Math.max(0, clearedCount - wordLength) * 5;
  return Math.round(wordScore * chainMultiplier) + collateral;
}

function advanceObjectives(
  ctx: WordfallContext,
  progress: number[],
  board: Board,
  cleared: ReadonlySet<number>,
  word: string,
  cratesBroken: number,
  scoreAfter: number,
): number[] {
  return ctx.level.objectives.map((objective, i) => {
    const current = progress[i] ?? 0;
    switch (objective.kind) {
      case 'score':
        // Absolute, not incremental — the score IS the progress.
        return scoreAfter;
      case 'words':
        return current + 1;
      case 'length':
        return word.length >= objective.minLength ? current + 1 : current;
      case 'crates':
        return current + cratesBroken;
      case 'letter': {
        let n = 0;
        for (const index of cleared) {
          if (board.tiles[index].letter === objective.letter) n++;
        }
        return current + n;
      }
    }
  });
}

export function reducer(
  state: WordfallState,
  action: Action,
  ctx: WordfallContext,
): WordfallState {
  switch (action.type) {
    case 'restart':
      return newGame(ctx, action.seed);

    case 'restore':
      return action.state;

    case 'cancel':
      return state.selection.length === 0 ? state : { ...state, selection: [] };

    case 'tick': {
      if (state.status !== 'playing') return state;
      // Monotonic. A device clock can jump backwards — sleep, an NTP
      // correction, a timezone change — and handing back time already spent
      // would let a player rewind their way out of losing.
      const elapsedMs = Math.max(state.elapsedMs, Math.floor(action.elapsedMs));
      // Returning the identical object when nothing moved keeps a 5 Hz timer
      // from re-rendering the whole board for no reason.
      if (elapsedMs === state.elapsedMs) return state;

      // Untimed levels still accumulate elapsed time — it is reported as the
      // completion time — they just cannot lose to it.
      const limit = ctx.level.timeLimitMs;
      if (limit !== undefined && elapsedMs >= limit) {
        return {
          ...state,
          // Pinned to the limit so the recorded time is the budget, not
          // "however late the last tick happened to land".
          elapsedMs: limit,
          status: 'lost',
          selection: [],
        };
      }
      return { ...state, elapsedMs };
    }

    case 'trace': {
      if (state.status !== 'playing') return state;
      const { index } = action;
      const tile = state.board.tiles[index];
      if (!tile || tile.crate) return state;

      const { selection } = state;
      // Starting a new trace clears the previous result, so stale feedback from
      // the last word is not sitting on screen while a new one is drawn.
      if (selection.length === 0) {
        return { ...state, selection: [index], rejection: null, lastPlay: null };
      }

      const last = selection[selection.length - 1];
      if (index === last) return state;

      // Dragging back onto the previous tile undoes the last step. Players
      // discover this without being told, and its absence feels broken.
      if (selection.length >= 2 && index === selection[selection.length - 2]) {
        return { ...state, selection: selection.slice(0, -1) };
      }

      if (selection.includes(index)) return state;
      if (!areAdjacent(state.board, last, index)) return state;
      if (selection.length >= ctx.dictionary.maxLength) return state;

      return { ...state, selection: [...selection, index] };
    }

    case 'submit': {
      if (state.status !== 'playing') return state;
      const selection = state.selection;
      const word = tracedWord(state);

      if (selection.length < ctx.dictionary.minLength) {
        return {
          ...state,
          selection: [],
          rejection: { kind: 'too-short', word, minLength: ctx.dictionary.minLength },
        };
      }
      if (!ctx.dictionary.isWord(word)) {
        return { ...state, selection: [], rejection: { kind: 'not-a-word', word } };
      }
      if (state.played.includes(word)) {
        return { ...state, selection: [], rejection: { kind: 'already-played', word } };
      }

      const props = analyze(word, ctx.dictionary.rarityOf(word));
      const createdKind = specialFor(props);
      const anchor = selection[selection.length - 1];

      const { cleared, triggered, chain } = resolvePlay(state.board, selection, createdKind);
      const cratesBroken = breakCrates(state.board, cleared);

      const points = pointsFor(
        scoreWord(props, ctx.letterValue),
        cleared.size,
        word.length,
        chain,
      );
      const score = state.score + points;

      const progress = advanceObjectives(
        ctx,
        state.progress,
        state.board,
        cleared,
        word,
        cratesBroken.length,
        score,
      );

      // Stamp the new special before gravity, so it falls with its tile.
      let board = state.board;
      if (createdKind) {
        const tiles = board.tiles.slice();
        tiles[anchor] = { ...tiles[anchor], special: createdKind };
        board = { ...board, tiles };
      }

      const removed = new Set<number>([...cleared, ...cratesBroken]);
      let settled = settle(board, removed, ctx.bag, state.seed, state.nextTileId);

      // A refilled board can, rarely, contain no words at all. Reshuffling is
      // the only honest response: the alternative is a player burning their
      // remaining moves on a grid the game already knows is dead.
      if (!isPlayable(settled.board, ctx.solver)) {
        const shuffled = reshuffle(settled.board, ctx.bag, settled.seed);
        settled = { ...settled, board: shuffled.board, seed: shuffled.seed };
      }

      const movesLeft = state.movesLeft - 1;
      const won = allObjectivesMet(ctx, progress);

      const lastPlay: PlayResult = {
        word,
        points,
        rarity: props.rarity,
        created: createdKind ? { kind: createdKind, index: anchor } : null,
        triggered,
        cleared: [...cleared],
        cratesBroken: cratesBroken.length,
        chain,
      };

      return {
        ...state,
        board: settled.board,
        seed: settled.seed,
        nextTileId: settled.nextTileId,
        movesLeft,
        score,
        progress,
        // Winning takes precedence: a final move that completes the objectives
        // is a win, not a loss for running out of moves at the same instant.
        status: won ? 'won' : movesLeft <= 0 ? 'lost' : 'playing',
        selection: [],
        lastPlay,
        rejection: null,
        played: [...state.played, word],
      };
    }
  }
}
