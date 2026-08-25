import { describe, expect, it } from 'vitest';
import { DICTIONARY, LEVELS, levelByNumber } from '../../data/wordfall';
import { indexAt, neighbors as neighborsOf } from './board';
import { analyze, scoreWord, specialFor } from './linguistics';
import {
  allObjectivesMet,
  createContext,
  lostToClock,
  newGame,
  objectiveMet,
  reducer,
  timeLeftMs,
  tracedWord,
  type Action,
  type WordfallContext,
} from './engine';
import type { Board, Level, SpecialKind, Tile, WordfallState } from './types';

const level = (over: Partial<Level> = {}): Level => ({
  number: 1,
  name: 'Test',
  description: 'Test level',
  moves: 10,
  crates: 0,
  objectives: [{ kind: 'words', target: 3 }],
  ...over,
});

const ctxFor = (over: Partial<Level> = {}) => createContext(level(over), DICTIONARY);

/**
 * Builds a state around a hand-drawn board.
 *
 * Generated boards are the right thing to test the generator with and the wrong
 * thing to test rules with — "did the beam clear the row" needs a board whose
 * rows are known.
 */
function stateWith(
  ctx: WordfallContext,
  rows: string[],
  opts: { specials?: Record<number, SpecialKind>; crates?: number[] } = {},
): WordfallState {
  const width = rows[0].length;
  const tiles: Tile[] = [];
  let id = 1;
  for (const row of rows) {
    for (const letter of row) {
      tiles.push({ id: id++, letter, special: null, crate: false });
    }
  }
  for (const [index, kind] of Object.entries(opts.specials ?? {})) {
    tiles[Number(index)] = { ...tiles[Number(index)], special: kind };
  }
  for (const index of opts.crates ?? []) {
    tiles[index] = { ...tiles[index], crate: true };
  }
  const board: Board = { width, height: rows.length, tiles };

  return {
    levelNumber: ctx.level.number,
    board,
    seed: 12345,
    movesLeft: ctx.level.moves,
    elapsedMs: 0,
    score: 0,
    progress: ctx.level.objectives.map(() => 0),
    status: 'playing',
    selection: [],
    lastPlay: null,
    rejection: null,
    played: [],
    nextTileId: 1000,
  };
}

/** Traces a run of indices, then submits. */
function play(state: WordfallState, ctx: WordfallContext, path: number[]): WordfallState {
  let s = state;
  for (const index of path) s = reducer(s, { type: 'trace', index }, ctx);
  return reducer(s, { type: 'submit' }, ctx);
}

const trace = (s: WordfallState, ctx: WordfallContext, i: number): WordfallState =>
  reducer(s, { type: 'trace', index: i }, ctx);

describe('newGame', () => {
  const ctx = ctxFor();

  it('starts a level ready to play', () => {
    const state = newGame(ctx, 4242);
    expect(state.status).toBe('playing');
    expect(state.movesLeft).toBe(ctx.level.moves);
    expect(state.score).toBe(0);
    expect(state.selection).toEqual([]);
    expect(state.board.tiles).toHaveLength(56);
    expect(state.progress).toEqual([0]);
  });

  it('is deterministic for a seed', () => {
    const a = newGame(ctx, 777);
    const b = newGame(ctx, 777);
    expect(a.board.tiles.map((t) => t.letter)).toEqual(b.board.tiles.map((t) => t.letter));
  });
});

describe('tracing', () => {
  const ctx = ctxFor();
  //  s t o n e
  //  x q x x x
  const rows = ['stone', 'xqxxx'];

  it('starts a trace on any letter tile', () => {
    const state = trace(stateWith(ctx, rows), ctx, 0);
    expect(state.selection).toEqual([0]);
  });

  it('extends only to adjacent tiles', () => {
    let s = trace(stateWith(ctx, rows), ctx, 0);
    s = trace(s, ctx, 1);
    expect(s.selection).toEqual([0, 1]);
    // Index 4 is three columns away from index 1.
    s = trace(s, ctx, 4);
    expect(s.selection).toEqual([0, 1]);
  });

  it('accepts diagonal steps', () => {
    let s = trace(stateWith(ctx, rows), ctx, 0);
    s = trace(s, ctx, 6); // down-right
    expect(s.selection).toEqual([0, 6]);
  });

  it('backtracks when dragged onto the previous tile', () => {
    let s = stateWith(ctx, rows);
    for (const i of [0, 1, 2]) s = trace(s, ctx, i);
    expect(s.selection).toEqual([0, 1, 2]);
    s = trace(s, ctx, 1);
    expect(s.selection).toEqual([0, 1]);
  });

  it('ignores a tile already in the trace', () => {
    let s = stateWith(ctx, rows);
    for (const i of [0, 1, 2]) s = trace(s, ctx, i);
    s = trace(s, ctx, 0);
    expect(s.selection).toEqual([0, 1, 2]);
  });

  it('will not start or pass through a crate', () => {
    const s = stateWith(ctx, rows, { crates: [1] });
    expect(trace(s, ctx, 1).selection).toEqual([]);
    const started = trace(trace(s, ctx, 0), ctx, 1);
    expect(started.selection).toEqual([0]);
  });

  it('stops at the longest word the dictionary holds', () => {
    const wide = stateWith(ctx, ['abcdefghij', 'klmnopqrst']);
    let s = wide;
    for (let i = 0; i < 10; i++) s = trace(s, ctx, i);
    expect(s.selection).toHaveLength(DICTIONARY.maxLength);
  });

  it('cancels without spending a move', () => {
    let s = trace(stateWith(ctx, rows), ctx, 0);
    s = reducer(s, { type: 'cancel' }, ctx);
    expect(s.selection).toEqual([]);
    expect(s.movesLeft).toBe(ctx.level.moves);
  });

  it('reads the traced word off the board', () => {
    let s = stateWith(ctx, rows);
    for (const i of [0, 1, 2, 3, 4]) s = trace(s, ctx, i);
    expect(tracedWord(s)).toBe('stone');
  });
});

describe('submitting', () => {
  const ctx = ctxFor();
  // Five rows of real letters, so the board still holds words after a refill.
  // On a near-empty fixture the engine's dead-board rescue would reshuffle and
  // these assertions would be testing the rescue instead of the rules.
  const rows = ['stone', 'rates', 'lined', 'coast', 'tenor'];

  it('rejects a trace shorter than the minimum', () => {
    const s = play(stateWith(ctx, rows), ctx, [0, 1]);
    expect(s.rejection).toEqual({ kind: 'too-short', word: 'st', minLength: 3 });
    expect(s.movesLeft).toBe(ctx.level.moves);
    expect(s.selection).toEqual([]);
  });

  it('rejects a non-word without spending a move', () => {
    // s -> t -> o reads "sto", which is not a word.
    const s = play(stateWith(ctx, rows), ctx, [0, 1, 2]);
    expect(s.rejection?.kind).toBe('not-a-word');
    expect(s.movesLeft).toBe(ctx.level.moves);
    expect(s.score).toBe(0);
  });

  it('rejects a word already played this level', () => {
    const first = play(stateWith(ctx, rows), ctx, [0, 1, 2, 3, 4]);
    expect(first.rejection).toBe(null);
    // The board refilled, so restore the original grid and trace it again.
    const again = { ...first, board: stateWith(ctx, rows).board };
    const s = play(again, ctx, [0, 1, 2, 3, 4]);
    expect(s.rejection).toEqual({ kind: 'already-played', word: 'stone' });
    expect(s.movesLeft).toBe(first.movesLeft);
  });

  it('scores a valid word and spends one move', () => {
    const s = play(stateWith(ctx, rows), ctx, [0, 1, 2, 3, 4]);
    expect(s.rejection).toBe(null);
    expect(s.score).toBeGreaterThan(0);
    expect(s.movesLeft).toBe(ctx.level.moves - 1);
    expect(s.played).toEqual(['stone']);
    expect(s.lastPlay?.word).toBe('stone');
  });

  it('refills the board so it is never left with holes', () => {
    const s = play(stateWith(ctx, rows), ctx, [0, 1, 2, 3, 4]);
    expect(s.board.tiles).toHaveLength(25);
    expect(s.board.tiles.every((t) => /^[a-z]$/.test(t.letter))).toBe(true);
  });
});

describe('special tiles', () => {
  const ctx = ctxFor();
  const rows = ['stone', 'rates', 'lined', 'coast', 'tenor'];

  it('leaves the earned special on the last tile of the word', () => {
    // STONE is five letters, so it earns a beam — and the beam lands on the E.
    const s = play(stateWith(ctx, rows), ctx, [0, 1, 2, 3, 4]);
    expect(s.lastPlay?.created?.kind).toBe('beam');
    expect(s.lastPlay?.created?.index).toBe(4);
  });

  it('keeps the anchor tile on the board while the rest of the word clears', () => {
    const s = play(stateWith(ctx, rows), ctx, [0, 1, 2, 3, 4]);
    // Four tiles cleared, not five: the E survived carrying the beam. Its
    // column was untouched, so it is still sitting where it was traced.
    expect(s.lastPlay?.cleared).toHaveLength(4);
    const anchor = s.board.tiles[indexAt(s.board, 0, 4)];
    expect(anchor.letter).toBe('e');
    expect(anchor.special).toBe('beam');
  });

  it('clears the whole word when it earns nothing', () => {
    // CAT is three letters with no rare or doubled letter — no special, so
    // there is no anchor to spare.
    const s = play(stateWith(ctx, ['catel', 'rates', 'lined', 'coast', 'tenor']), ctx, [0, 1, 2]);
    expect(s.lastPlay?.created).toBe(null);
    expect(s.lastPlay?.cleared).toHaveLength(3);
  });

  it('awards the special the word’s properties earned', () => {
    const filler = ['rates', 'lined', 'coast', 'tenor'];
    const cases: Array<[string, number[], SpecialKind]> = [
      ['quize', [0, 1, 2, 3], 'ember'],
      ['books', [0, 1, 2, 3], 'flare'],
      ['stone', [0, 1, 2, 3, 4], 'beam'],
    ];
    for (const [top, path, expected] of cases) {
      const s = play(stateWith(ctx, [top, ...filler]), ctx, path);
      expect(s.lastPlay?.created?.kind, top).toBe(expected);
    }
    // Seven letters needs a wider board than the five-wide fixtures above.
    const nova = play(stateWith(ctx, ['crystal', 'ratesxx', 'linedxx']), ctx, [0, 1, 2, 3, 4, 5, 6]);
    expect(nova.lastPlay?.created?.kind).toBe('nova');
  });
});

describe('chain reactions', () => {
  const ctx = ctxFor();
  //  c a t e l
  //  r a t e s
  //  l i n e d
  const rows = ['catel', 'rates', 'lined'];

  it('fires a special that a later word runs through', () => {
    // The T at index 2 carries a beam, so playing CAT clears its row and
    // column as well as the word.
    const s = play(stateWith(ctx, rows, { specials: { 2: 'beam' } }), ctx, [0, 1, 2]);
    expect(s.lastPlay?.triggered).toEqual(['beam']);
    expect(s.lastPlay?.chain).toBe(2);
    // Row 0 is five tiles, plus two more down column 2.
    expect(s.lastPlay?.cleared).toHaveLength(7);
  });

  it('cascades when one special catches another', () => {
    // The beam at index 2 clears down column 2, which contains the nova at
    // index 7 — so the nova goes off too, inside the same move.
    const s = play(stateWith(ctx, rows, { specials: { 2: 'beam', 7: 'nova' } }), ctx, [0, 1, 2]);
    expect(s.lastPlay?.triggered).toContain('beam');
    expect(s.lastPlay?.triggered).toContain('nova');
    expect(s.lastPlay?.chain).toBe(3);
  });

  it('pays more for a chain than for the same word alone', () => {
    const plain = play(stateWith(ctx, rows), ctx, [0, 1, 2]);
    const chained = play(stateWith(ctx, rows, { specials: { 2: 'beam' } }), ctx, [0, 1, 2]);
    expect(chained.score).toBeGreaterThan(plain.score);
  });

  it('fires a special the word ends on, then replaces it', () => {
    // Ending BOOK on a beam should not silently throw the beam away — it goes
    // off, and the flare BOOK earned takes its place.
    const s = play(
      stateWith(ctx, ['books', 'rates', 'lined'], { specials: { 3: 'beam' } }),
      ctx,
      [0, 1, 2, 3],
    );
    expect(s.lastPlay?.triggered).toEqual(['beam']);
    expect(s.lastPlay?.created?.kind).toBe('flare');
  });

  it('terminates on a board densely packed with specials', () => {
    // Every tile a beam. If the cascade did not track what it had already
    // cleared, this would not return.
    const specials = Object.fromEntries(
      Array.from({ length: 15 }, (_, i) => [i, 'beam' as SpecialKind]),
    );
    const s = play(stateWith(ctx, rows, { specials }), ctx, [0, 1, 2]);
    expect(s.lastPlay!.cleared.length).toBeGreaterThan(0);
    // Every cleared index appears exactly once, however many times it was hit.
    expect(new Set(s.lastPlay!.cleared).size).toBe(s.lastPlay!.cleared.length);
  });
});

describe('crates', () => {
  const ctx = ctxFor({ crates: 2, objectives: [{ kind: 'crates', target: 2 }] });

  it('breaks a crate touching a cleared tile', () => {
    //  c a t
    //  [] r t     the crate sits directly under the C
    const s = play(stateWith(ctx, ['cat', 'ort'], { crates: [3] }), ctx, [0, 1, 2]);
    expect(s.lastPlay?.cratesBroken).toBe(1);
    expect(s.board.tiles.some((t) => t.crate)).toBe(false);
  });

  it('does not break a crate that only touches diagonally', () => {
    //  c a t s
    //  o r e []   the crate is diagonal from the T, not orthogonal
    const s = play(stateWith(ctx, ['cats', 'ored'], { crates: [7] }), ctx, [0, 1, 2]);
    expect(s.lastPlay?.cratesBroken).toBe(0);
  });

  it('counts broken crates toward the objective', () => {
    //  c  a  t
    //  [] r  []
    const s = play(stateWith(ctx, ['cat', 'ore'], { crates: [3, 5] }), ctx, [0, 1, 2]);
    expect(s.lastPlay?.cratesBroken).toBe(2);
    expect(s.progress[0]).toBe(2);
    expect(s.status).toBe('won');
  });
});

describe('objectives', () => {
  it('counts words', () => {
    const ctx = ctxFor({ objectives: [{ kind: 'words', target: 2 }] });
    let s = play(stateWith(ctx, ['cat', 'xxx']), ctx, [0, 1, 2]);
    expect(s.progress[0]).toBe(1);
    expect(s.status).toBe('playing');
    s = play({ ...s, board: stateWith(ctx, ['dog', 'xxx']).board }, ctx, [0, 1, 2]);
    expect(s.progress[0]).toBe(2);
    expect(s.status).toBe('won');
  });

  it('counts only words that meet a length requirement', () => {
    const ctx = ctxFor({ objectives: [{ kind: 'length', minLength: 5, target: 1 }] });
    let s = play(stateWith(ctx, ['cat', 'xxx']), ctx, [0, 1, 2]);
    expect(s.progress[0]).toBe(0);
    s = play({ ...s, board: stateWith(ctx, ['stone', 'xxxxx']).board }, ctx, [0, 1, 2, 3, 4]);
    expect(s.progress[0]).toBe(1);
  });

  it('counts cleared tiles of a specific letter', () => {
    const ctx = ctxFor({ objectives: [{ kind: 'letter', letter: 't', target: 1 }] });
    const s = play(stateWith(ctx, ['cat', 'xxx']), ctx, [0, 1, 2]);
    // The T cleared with the word — no special was earned, so nothing survived.
    expect(s.progress[0]).toBe(1);
  });

  it('tracks score as an absolute, not a running total of increments', () => {
    const ctx = ctxFor({ objectives: [{ kind: 'score', target: 1_000_000 }] });
    const s = play(stateWith(ctx, ['stone', 'xxxxx']), ctx, [0, 1, 2, 3, 4]);
    expect(s.progress[0]).toBe(s.score);
  });

  it('needs every objective met to win', () => {
    const ctx = ctxFor({
      objectives: [
        { kind: 'words', target: 1 },
        { kind: 'score', target: 1_000_000 },
      ],
    });
    const s = play(stateWith(ctx, ['cat', 'xxx']), ctx, [0, 1, 2]);
    expect(objectiveMet(ctx.level.objectives[0], s.progress[0])).toBe(true);
    expect(allObjectivesMet(ctx, s.progress)).toBe(false);
    expect(s.status).toBe('playing');
  });
});

describe('winning and losing', () => {
  it('loses when the moves run out', () => {
    const ctx = ctxFor({ moves: 1, objectives: [{ kind: 'words', target: 99 }] });
    const s = play(stateWith(ctx, ['cat', 'xxx']), ctx, [0, 1, 2]);
    expect(s.movesLeft).toBe(0);
    expect(s.status).toBe('lost');
  });

  it('wins on the last move rather than losing to it', () => {
    // Both conditions land on the same dispatch. The player met the goal.
    const ctx = ctxFor({ moves: 1, objectives: [{ kind: 'words', target: 1 }] });
    const s = play(stateWith(ctx, ['cat', 'xxx']), ctx, [0, 1, 2]);
    expect(s.movesLeft).toBe(0);
    expect(s.status).toBe('won');
  });

  it('ignores input once the level is over', () => {
    const ctx = ctxFor({ moves: 1, objectives: [{ kind: 'words', target: 99 }] });
    const done = play(stateWith(ctx, ['cat', 'xxx']), ctx, [0, 1, 2]);
    expect(reducer(done, { type: 'trace', index: 0 }, ctx)).toBe(done);
    expect(reducer(done, { type: 'submit' }, ctx)).toBe(done);
  });

  it('restarts from a fresh seed', () => {
    const ctx = ctxFor({ moves: 1, objectives: [{ kind: 'words', target: 99 }] });
    const done = play(stateWith(ctx, ['cat', 'xxx']), ctx, [0, 1, 2]);
    const fresh = reducer(done, { type: 'restart', seed: 9090 }, ctx);
    expect(fresh.status).toBe('playing');
    expect(fresh.score).toBe(0);
    expect(fresh.movesLeft).toBe(ctx.level.moves);
    expect(fresh.played).toEqual([]);
  });
});

describe('purity', () => {
  const ctx = ctxFor();

  it('never mutates the state it is given', () => {
    const before = stateWith(ctx, ['stone', 'xxxxx']);
    const snapshot = JSON.stringify(before);
    play(before, ctx, [0, 1, 2, 3, 4]);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('replays a whole run identically from the same seed', () => {
    const run = (): WordfallState => {
      let s = newGame(ctx, 31337);
      // Any deterministic sequence of dispatches will do; the point is that
      // two runs of it agree tile for tile.
      for (const path of [
        [0, 1, 2],
        [7, 8, 9],
        [14, 15, 16],
      ]) {
        s = play(s, ctx, path);
      }
      return s;
    };
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });
});

describe('shipped levels', () => {
  it('numbers levels consecutively from 1', () => {
    expect(LEVELS.map((l) => l.number)).toEqual(LEVELS.map((_, i) => i + 1));
  });

  it('sets Stretch to four-letter words and longer', () => {
    const stretch = levelByNumber(2)!;

    expect(stretch.description).toBe('Make four-letter words and longer for bigger scores.');
    expect(stretch.objectives).toEqual([{ kind: 'length', minLength: 4, target: 4 }]);
  });

  it('gives every level a name, moves and at least one objective', () => {
    for (const l of LEVELS) {
      expect(l.name.length, `level ${l.number}`).toBeGreaterThan(0);
      expect(l.moves).toBeGreaterThan(0);
      expect(l.objectives.length).toBeGreaterThan(0);
      for (const o of l.objectives) expect(o.target).toBeGreaterThan(0);
    }
  });

  it('never asks for more crates than it seeds', () => {
    // An unreachable objective is an unwinnable level.
    for (const l of LEVELS) {
      const crateGoal = l.objectives.find((o) => o.kind === 'crates');
      if (crateGoal) expect(crateGoal.target).toBeLessThanOrEqual(l.crates);
    }
  });

  it('opens every level on a playable board', () => {
    for (const l of LEVELS) {
      const ctx = createContext(levelByNumber(l.number)!, DICTIONARY);
      for (const seed of [1, 500, 90210]) {
        const state = newGame(ctx, seed);
        expect(state.board.tiles.filter((t) => t.crate)).toHaveLength(l.crates);
        expect(state.status).toBe('playing');
      }
    }
  });
});

/**
 * Plays every shipped level with a bot that always takes the highest-scoring
 * word available.
 *
 * This is the guard against the one content bug that cannot be worked around: a
 * level nobody can finish. The bot finds words no human would spot, so clearing
 * a level here is necessary but not sufficient — what the test really watches
 * for is a target edited into unreachability.
 *
 * The path finder lives here rather than in `board.ts` because nothing in the
 * game needs it. Shipping a solver to every player so a test can use it would
 * be the wrong trade.
 */
describe('every shipped level can be finished', () => {
  /** Word -> the path that spells it. */
  function tracePaths(state: WordfallState, ctx: WordfallContext): Map<string, number[]> {
    const board = state.board;
    const out = new Map<string, number[]>();
    const visited = new Array<boolean>(board.tiles.length).fill(false);

    const walk = (index: number, prefix: string, path: number[]) => {
      const tile = board.tiles[index];
      if (tile.crate) return;
      const word = prefix + tile.letter;
      if (word.length > DICTIONARY.maxLength) return;
      if (word.length > 1 && !ctx.solver.prefixes.has(word) && !ctx.solver.words.has(word)) return;

      const next = [...path, index];
      visited[index] = true;
      if (word.length >= 3 && !out.has(word) && DICTIONARY.isWord(word)) out.set(word, next);
      if (ctx.solver.prefixes.has(word)) {
        for (const n of neighborsOf(board, index)) if (!visited[n]) walk(n, word, next);
      }
      visited[index] = false;
    };

    for (let i = 0; i < board.tiles.length; i++) walk(i, '', []);
    return out;
  }

  function bestPlay(state: WordfallState, ctx: WordfallContext): number[] | null {
    let best: number[] | null = null;
    let bestScore = -1;
    for (const [word, path] of tracePaths(state, ctx)) {
      if (state.played.includes(word)) continue;
      const props = analyze(word, DICTIONARY.rarityOf(word));
      const score = scoreWord(props, ctx.letterValue) + (specialFor(props) ? 60 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = path;
      }
    }
    return best;
  }

  /**
   * How long a hurrying player is assumed to take to find and play one word.
   *
   * The solver finds words instantly, so on a timed level it would clear any
   * budget and prove nothing. Charging it this much per move turns the clock
   * into a move budget the solver CAN feel, which makes the time limits
   * testable — and pins the assumption they were sized from, so tightening one
   * past winnability fails here instead of in a player's hands.
   */
  const ASSUMED_MS_PER_MOVE = 7000;

  function run(levelNumber: number, seed: number): WordfallState {
    const level = levelByNumber(levelNumber)!;
    const ctx = createContext(level, DICTIONARY);
    let state = newGame(ctx, seed);
    let elapsed = 0;

    while (state.status === 'playing') {
      // Charged BEFORE the move: the time goes on finding the word, so the
      // last word of a run has to be paid for like every other one.
      if (level.timeLimitMs !== undefined) {
        elapsed += ASSUMED_MS_PER_MOVE;
        state = reducer(state, { type: 'tick', elapsedMs: elapsed }, ctx);
        if (state.status !== 'playing') break;
      }
      const path = bestPlay(state, ctx);
      if (!path) break;
      for (const index of path) state = reducer(state, { type: 'trace', index }, ctx);
      const after = reducer(state, { type: 'submit' }, ctx);
      // No progress means the bot is stuck; bail rather than spin.
      if (after.movesLeft === state.movesLeft) break;
      state = after;
    }
    return state;
  }

  // Fixed seeds, so this is deterministic rather than flaky. Several per level
  // because a single board is luck, not evidence.
  const SEEDS = [11, 4242, 90210];

  for (const level of LEVELS) {
    it(`level ${level.number} — ${level.name}`, () => {
      const results = SEEDS.map((seed) => run(level.number, seed));
      const wins = results.filter((s) => s.status === 'won');
      expect(
        wins.length,
        `no seed cleared level ${level.number}; targets may be unreachable`,
      ).toBeGreaterThan(0);
      // And it should not be trivially over on the first move either.
      for (const win of wins) expect(win.movesLeft).toBeLessThan(level.moves - 1);
    });
  }
});

describe('the clock', () => {
  const timed = (timeLimitMs?: number) =>
    ctxFor({ moves: 30, timeLimitMs, objectives: [{ kind: 'words', target: 99 }] });
  const rows = ['stone', 'rates', 'lined', 'coast', 'tenor'];
  const tick = (s: WordfallState, ctx: WordfallContext, elapsedMs: number) =>
    reducer(s, { type: 'tick', elapsedMs }, ctx);

  it('starts every level at zero', () => {
    expect(newGame(timed(60_000), 1).elapsedMs).toBe(0);
  });

  it('records elapsed time', () => {
    const ctx = timed(60_000);
    expect(tick(stateWith(ctx, rows), ctx, 4200).elapsedMs).toBe(4200);
  });

  it('never runs backwards', () => {
    // Device clocks jump — sleep, an NTP correction, a timezone change. Handing
    // back time already spent would let a player rewind out of losing.
    const ctx = timed(60_000);
    let s = tick(stateWith(ctx, rows), ctx, 30_000);
    s = tick(s, ctx, 12_000);
    expect(s.elapsedMs).toBe(30_000);
  });

  it('returns the identical state when no whole millisecond passed', () => {
    // A 5 Hz timer must not re-render the board for nothing.
    const ctx = timed(60_000);
    const s = tick(stateWith(ctx, rows), ctx, 4200);
    expect(tick(s, ctx, 4200)).toBe(s);
  });

  it('loses the level when the limit is reached', () => {
    const ctx = timed(60_000);
    const s = tick(stateWith(ctx, rows), ctx, 60_000);
    expect(s.status).toBe('lost');
    expect(lostToClock(s, ctx)).toBe(true);
  });

  it('pins elapsed time to the limit rather than to whenever the tick landed', () => {
    const ctx = timed(60_000);
    // A backgrounded tab can resume with a much later timestamp.
    expect(tick(stateWith(ctx, rows), ctx, 91_234).elapsedMs).toBe(60_000);
  });

  it('drops a half-finished trace when time expires', () => {
    const ctx = timed(60_000);
    let s = stateWith(ctx, rows);
    for (const i of [0, 1, 2]) s = reducer(s, { type: 'trace', index: i }, ctx);
    expect(s.selection).toHaveLength(3);
    expect(tick(s, ctx, 60_000).selection).toEqual([]);
  });

  it('reports the time remaining, and nothing on an untimed level', () => {
    const t = timed(60_000);
    expect(timeLeftMs(tick(stateWith(t, rows), t, 20_000), t)).toBe(40_000);
    const u = timed(undefined);
    expect(timeLeftMs(stateWith(u, rows), u)).toBe(null);
  });

  it('still tracks elapsed time on an untimed level, but cannot lose to it', () => {
    // Completion time is worth reporting even when nothing rides on it.
    const ctx = timed(undefined);
    const s = tick(stateWith(ctx, rows), ctx, 10 * 60_000);
    expect(s.elapsedMs).toBe(600_000);
    expect(s.status).toBe('playing');
  });

  it('stops once the level is over, so the recorded time is the finishing time', () => {
    const ctx = ctxFor({ moves: 30, timeLimitMs: 60_000, objectives: [{ kind: 'words', target: 1 }] });
    let s = play(stateWith(ctx, rows), ctx, [0, 1, 2, 3, 4]);
    expect(s.status).toBe('won');
    s = tick(s, ctx, 59_000);
    expect(s.elapsedMs).toBe(0);
    expect(s.status).toBe('won');
  });

  it('does not lose a level that was already won at the buzzer', () => {
    const ctx = ctxFor({ moves: 30, timeLimitMs: 60_000, objectives: [{ kind: 'words', target: 1 }] });
    const won = play(stateWith(ctx, rows), ctx, [0, 1, 2, 3, 4]);
    expect(tick(won, ctx, 120_000).status).toBe('won');
  });

  it('resets the clock on restart', () => {
    const ctx = timed(60_000);
    const s = tick(stateWith(ctx, rows), ctx, 30_000);
    expect(reducer(s, { type: 'restart', seed: 5 }, ctx).elapsedMs).toBe(0);
  });

  it('blames the move budget, not the clock, when the moves ran out', () => {
    const ctx = ctxFor({ moves: 1, timeLimitMs: 60_000, objectives: [{ kind: 'words', target: 99 }] });
    const s = play(stateWith(ctx, rows), ctx, [0, 1, 2, 3, 4]);
    expect(s.status).toBe('lost');
    expect(lostToClock(s, ctx)).toBe(false);
  });
});

describe('shipped timed levels', () => {
  const timedLevels = LEVELS.filter((l) => l.timeLimitMs !== undefined);

  it('introduces the clock partway through the campaign, not at the start', () => {
    // The first levels teach the mechanics; adding urgency before the player
    // knows what a nova does would just be noise.
    expect(timedLevels.length).toBeGreaterThan(0);
    expect(Math.min(...timedLevels.map((l) => l.number))).toBeGreaterThan(1);
  });

  it('runs the timed launch levels consecutively at the end of the curriculum', () => {
    // Weekly drops after 11 may be puzzles or races; the launch set still
    // teaches the clock as one block so the first race is not isolated.
    const launchTimed = timedLevels.filter((l) => l.availableFrom === undefined);
    const numbers = launchTimed.map((l) => l.number);
    expect(numbers).toEqual(numbers.map((_, i) => numbers[0] + i));
    const lastLaunch = Math.max(
      ...LEVELS.filter((l) => l.availableFrom === undefined).map((l) => l.number),
    );
    expect(numbers.at(-1)).toBe(lastLaunch);
  });

  it('gives timed levels a move budget no player can exhaust', () => {
    // Otherwise a timed level could end for a reason the HUD is not showing.
    for (const level of timedLevels) {
      const seconds = level.timeLimitMs! / 1000;
      expect(level.moves, `level ${level.number}`).toBeGreaterThan(seconds);
    }
  });

  it('gives more time as the levels ask for more', () => {
    const limits = timedLevels.map((l) => l.timeLimitMs!);
    expect([...limits].sort((a, b) => a - b)).toEqual(limits);
  });
});
