/**
 * Wordfall levels.
 *
 * Hand-authored rather than generated, because the job of a level here is to
 * teach something. The order is a curriculum: each level makes one property of
 * a word matter, and only once the player has met a mechanic in isolation does
 * it start appearing in combination.
 *
 * Levels 1-8 are puzzles: a move budget, no clock. Levels 9-11 are races: a
 * clock, and a move budget set beyond reach so it never quietly ends a run.
 * A level is one or the other by design — see `Level.timeLimitMs`.
 *
 * TWO KINDS OF NUMBER LIVE HERE, and they carry very different confidence.
 *
 *   Score targets are CALIBRATED. They were sized by simulating a perfect
 *   solver over many seeds (see `engine.test.ts` — "every shipped level can be
 *   finished"), and the first guesses were wrong in both directions.
 *
 *   Time limits are ESTIMATED. A solver finds words instantly, so it cannot
 *   measure what the clock actually constrains: a human scanning a 7x8 grid.
 *   They are sized from one assumption — that a hurrying player plays a word
 *   roughly every seven seconds — which the test suite then enforces, so
 *   tightening a limit past the point of winnability fails loudly. The
 *   assumption itself still wants playtesting.
 */
import type { Level } from '../../games/wordfall/types';

const seconds = (n: number) => n * 1000;

/**
 * Move budget for a timed level.
 *
 * High enough to be unreachable — it would take a word per second — so the
 * clock is the only thing that can end the level. A timed level that could
 * also run out of moves would end for a reason the HUD is not showing.
 */
const UNLIMITED_MOVES = 99;

export const LEVELS: Level[] = [
  {
    number: 1,
    name: 'First Words',
    moves: 12,
    crates: 0,
    // Nothing but "play the game". A first level that also asks for a score is
    // asking the player to optimise something they have not learned yet.
    objectives: [{ kind: 'words', target: 6 }],
  },
  {
    number: 2,
    name: 'Stretch',
    moves: 14,
    crates: 0,
    // Forces the player past three-letter words, which is where beams — and
    // the whole special-tile system — start showing up on the board.
    objectives: [{ kind: 'length', minLength: 5, target: 4 }],
  },
  {
    number: 3,
    name: 'Boxed In',
    moves: 16,
    crates: 8,
    // First crates. Where you play now matters as much as what you spell.
    objectives: [{ kind: 'crates', target: 8 }],
  },
  {
    number: 4,
    name: 'High Score',
    moves: 14,
    crates: 0,
    // Roughly half what an exhaustive solver scores in the same budget. A
    // player who finds most of the words they look at clears this; one who
    // spells three-letter words for fourteen turns does not.
    objectives: [{ kind: 'score', target: 2800 }],
  },
  {
    number: 5,
    name: 'Vowel Play',
    moves: 16,
    crates: 4,
    // A letter target cannot be met by spelling carefully alone — it wants
    // beams and novas aimed at a part of the board.
    objectives: [
      // 22 was the first guess and a perfect solver missed it six runs in ten.
      // At 16 a solver that ignores the objective entirely still clears it 23
      // times in 30 — so a player who actually hunts for Es is safe, and one
      // who ignores the brief is not. That gap is the whole point of the level.
      { kind: 'letter', letter: 'e', target: 16 },
      { kind: 'crates', target: 4 },
    ],
  },
  {
    number: 6,
    name: 'Deep Cuts',
    moves: 18,
    crates: 0,
    // Seven letters is a nova. Two of them in a run is a real ask.
    objectives: [
      { kind: 'length', minLength: 6, target: 3 },
      { kind: 'score', target: 4000 },
    ],
  },
  {
    number: 7,
    name: 'Demolition',
    moves: 18,
    crates: 14,
    objectives: [
      { kind: 'crates', target: 14 },
      { kind: 'score', target: 3500 },
    ],
  },
  {
    number: 8,
    name: 'Everything',
    moves: 20,
    crates: 10,
    objectives: [
      // The last level should be hard, but 6000 sat at 71% of a perfect
      // solver's score on top of two other goals, which is not hard — it is a
      // wall.
      { kind: 'score', target: 5500 },
      { kind: 'crates', target: 10 },
      { kind: 'length', minLength: 5, target: 5 },
    ],
  },

  // ---------------------------------------------------------------------------
  // Timed levels. The clock arrives here, alone, and then keeps company.
  // ---------------------------------------------------------------------------

  {
    number: 9,
    name: 'Sixty Seconds',
    moves: UNLIMITED_MOVES,
    timeLimitMs: seconds(60),
    crates: 0,
    // Deliberately the SAME goal as level 1 — six words — with the clock as the
    // only thing that changed. Introducing a mechanic alongside a new objective
    // makes it impossible to tell which one is beating you, so the fair way to
    // teach urgency is on a task the player has already proved they can do.
    objectives: [{ kind: 'words', target: 6 }],
  },
  {
    number: 10,
    name: 'Quickfire',
    moves: UNLIMITED_MOVES,
    timeLimitMs: seconds(75),
    crates: 8,
    // Clock plus crates: the first combination. Crates are the mechanic that
    // most punishes hurrying, because they reward playing in a particular place
    // rather than playing the first word you spot.
    objectives: [{ kind: 'crates', target: 6 }],
  },
  {
    number: 11,
    name: 'Final Countdown',
    moves: UNLIMITED_MOVES,
    timeLimitMs: seconds(90),
    crates: 0,
    // Ninety seconds is about a dozen hurried moves, where a perfect solver
    // scores ~4,900. The target sits near 40% of that rather than the ~55% the
    // untimed levels use, because the long-word requirement pulls in the
    // opposite direction: the highest-scoring word available is often short.
    objectives: [
      { kind: 'score', target: 2000 },
      { kind: 'length', minLength: 5, target: 3 },
    ],
  },
];

export function levelByNumber(n: number): Level | undefined {
  return LEVELS.find((l) => l.number === n);
}

export const LAST_LEVEL = LEVELS[LEVELS.length - 1].number;
