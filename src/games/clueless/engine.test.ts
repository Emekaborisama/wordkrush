import { describe, expect, it } from 'vitest';
import {
  CLUELESS_HINTS,
  PUZZLES,
  VOCABULARY,
  puzzleByNumber,
  todaysPuzzleNumber,
} from '../../data/clueless';
import {
  bestRank,
  closeness,
  guessCount,
  indexPuzzle,
  isDifficultyLocked,
  isHintVisible,
  newPuzzle,
  normalizeGuess,
  reducer,
  STANDARD_HINT_GUESS_THRESHOLD,
  sortGuesses,
  type PuzzleIndex,
} from './engine';
import type { CluelessState } from './types';

// Runs against the REAL shipped puzzles, not fixtures — a synthetic puzzle
// would not catch a broken build or a misaligned vocabulary.
const puzzle = puzzleByNumber(22)!;
const index: PuzzleIndex = indexPuzzle(puzzle, VOCABULARY);

const guess = (state: CluelessState, word: string) => reducer(state, { type: 'guess', word }, index);
const fresh = () => newPuzzle(22);

describe('shipped data', () => {
  it('bundles every puzzle with a secret ranked first', () => {
    expect(PUZZLES).toHaveLength(30);
    for (const p of PUZZLES) {
      expect(p.ranked[0], `puzzle ${p.number}`).toBe(p.secret);
      expect(p.ranked.length).toBeGreaterThan(1000);
    }
  });

  it('numbers puzzles consecutively from 1', () => {
    expect(PUZZLES.map((p) => p.number)).toEqual(PUZZLES.map((_, i) => i + 1));
  });

  it('contains every ranked word in the vocabulary', () => {
    // A mismatch here would make real guesses bounce as "not a word".
    const vocab = new Set(VOCABULARY);
    for (const word of puzzle.ranked.slice(0, 500)) {
      expect(vocab.has(word), word).toBe(true);
    }
  });

  it('has a vocabulary at least as large as any puzzle rank list', () => {
    for (const p of PUZZLES) {
      expect(VOCABULARY.length).toBeGreaterThanOrEqual(p.ranked.length);
    }
  });

  it('pairs every shipped puzzle with one bounded, spoiler-free thematic hint', () => {
    expect(CLUELESS_HINTS).toHaveLength(PUZZLES.length);
    for (const puzzle of PUZZLES) {
      const hint = CLUELESS_HINTS.find((candidate) => candidate.puzzleNumber === puzzle.number);
      expect(hint?.secret, `puzzle ${puzzle.number}`).toBe(puzzle.secret);
      const words = hint!.text.trim().split(/\s+/);
      expect(words.length, `puzzle ${puzzle.number}`).toBeGreaterThanOrEqual(6);
      expect(words.length, `puzzle ${puzzle.number}`).toBeLessThanOrEqual(16);
      const escapedSecret = puzzle.secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(hint!.text, `puzzle ${puzzle.number}`).not.toMatch(
        new RegExp(`\\b${escapedSecret}\\b`, 'i'),
      );
    }
  });
});

describe('normalizeGuess', () => {
  it('lowercases and trims', () => {
    expect(normalizeGuess('  BLUE  ')).toBe('blue');
  });

  it('strips punctuation and digits', () => {
    expect(normalizeGuess('blue!')).toBe('blue');
    expect(normalizeGuess('bl2ue')).toBe('blue');
  });

  it('normalises iOS smart quotes', () => {
    // Autocorrect turns ' into ’, which would otherwise fail every lookup.
    expect(normalizeGuess('don’t')).toBe("don't");
  });

  it('reduces whitespace-only input to empty', () => {
    expect(normalizeGuess('   ')).toBe('');
  });
});

describe('guessing', () => {
  it('accepts the secret and wins', () => {
    const state = guess(fresh(), puzzle.secret);
    expect(state.status).toBe('won');
    expect(state.guesses[0].rank).toBe(1);
  });

  it('ranks a near word low and a far word high', () => {
    const state = guess(guess(fresh(), 'purple'), 'banana');
    const purple = state.guesses.find((g) => g.word === 'purple')!;
    const banana = state.guesses.find((g) => g.word === 'banana')!;
    expect(purple.rank!).toBeLessThan(banana.rank!);
  });

  it('keeps the list sorted best-first', () => {
    let state = fresh();
    for (const w of ['banana', 'purple', 'ocean', 'red']) state = guess(state, w);
    const ranks = state.guesses.map((g) => g.rank!);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('rejects a word outside the vocabulary', () => {
    const state = guess(fresh(), 'zzzzqqqq');
    expect(state.rejection).toEqual({ kind: 'not-a-word', word: 'zzzzqqqq' });
    expect(state.guesses).toHaveLength(0);
  });

  it('rejects empty input', () => {
    expect(guess(fresh(), '   ').rejection).toEqual({ kind: 'empty' });
  });

  it('does not count a repeated guess twice', () => {
    const once = guess(fresh(), 'purple');
    const twice = guess(once, 'PURPLE');
    expect(twice.guesses).toHaveLength(1);
    expect(twice.rejection?.kind).toBe('already-guessed');
  });

  it('ignores guesses after a win', () => {
    // Otherwise the recorded score keeps rising after the game is over.
    const won = guess(fresh(), puzzle.secret);
    expect(guess(won, 'purple')).toEqual(won);
  });

  it('clears a rejection once a valid guess lands', () => {
    const rejected = guess(fresh(), 'zzzzqqqq');
    expect(guess(rejected, 'purple').rejection).toBeNull();
  });
});

describe('difficulty and hints', () => {
  it('shows the hint immediately on easy and never on expert', () => {
    expect(isHintVisible(newPuzzle(22, 'easy'))).toBe(true);
    expect(isHintVisible(newPuzzle(22, 'expert'))).toBe(false);
  });

  it('reveals the standard hint after 15 valid unique guesses', () => {
    let state = newPuzzle(22, 'standard');
    const words = puzzle.ranked.slice(1, STANDARD_HINT_GUESS_THRESHOLD + 1);
    for (const [index, word] of words.entries()) {
      state = guess(state, word);
      expect(isHintVisible(state)).toBe(index + 1 >= STANDARD_HINT_GUESS_THRESHOLD);
    }
  });

  it('does not advance or lock difficulty for rejected guesses', () => {
    const invalid = guess(newPuzzle(22, 'standard'), 'zzzzqqqq');
    expect(invalid.guesses).toHaveLength(0);
    expect(isDifficultyLocked(invalid)).toBe(false);
    expect(isHintVisible(invalid)).toBe(false);
  });

  it('locks difficulty after the first valid guess', () => {
    const state = guess(newPuzzle(22, 'easy'), 'purple');
    expect(isDifficultyLocked(state)).toBe(true);
    expect(state.difficulty).toBe('easy');
  });
});

describe('sortGuesses', () => {
  it('sinks unranked words below ranked ones', () => {
    const sorted = sortGuesses([
      { word: 'cold', rank: null },
      { word: 'warm', rank: 500 },
      { word: 'hot', rank: 2 },
    ]);
    expect(sorted.map((g) => g.word)).toEqual(['hot', 'warm', 'cold']);
  });
});

describe('closeness', () => {
  it('is 1 for the answer and 0 for unranked', () => {
    expect(closeness(1, 5000)).toBe(1);
    expect(closeness(null, 5000)).toBe(0);
  });

  it('decreases as rank grows', () => {
    expect(closeness(10, 5000)).toBeGreaterThan(closeness(1000, 5000));
  });

  it('stays inside 0..1', () => {
    for (const r of [1, 2, 50, 4999, 5000, 99999]) {
      const c = closeness(r, 5000);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });

  it('is log-scaled, not linear', () => {
    // Halfway through the rank range should be well past halfway in feel;
    // a linear bar would sit near zero for almost the entire game.
    expect(closeness(2500, 5000)).toBeGreaterThan(0.05);
    expect(closeness(50, 5000)).toBeGreaterThan(0.5);
  });
});

describe('scoring helpers', () => {
  it('counts guesses used', () => {
    expect(guessCount(guess(guess(fresh(), 'purple'), 'ocean'))).toBe(2);
  });

  it('reports the best rank so far', () => {
    const state = guess(guess(fresh(), 'banana'), 'purple');
    expect(bestRank(state)).toBe(state.guesses[0].rank);
  });

  it('has no best rank before any guess', () => {
    expect(bestRank(fresh())).toBeNull();
  });
});

describe('todaysPuzzleNumber', () => {
  it('starts at puzzle 1 on the epoch date', () => {
    expect(todaysPuzzleNumber(new Date('2026-08-17T12:00:00Z'))).toBe(1);
  });

  it('advances one per day', () => {
    expect(todaysPuzzleNumber(new Date('2026-08-18T00:00:00Z'))).toBe(2);
  });

  it('is stable across a single day', () => {
    expect(todaysPuzzleNumber(new Date('2026-08-18T00:01:00Z'))).toBe(
      todaysPuzzleNumber(new Date('2026-08-18T23:59:00Z')),
    );
  });

  it('wraps instead of running out', () => {
    // A player arriving after the set is exhausted must still get a game.
    const n = todaysPuzzleNumber(new Date('2027-08-17T12:00:00Z'));
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(PUZZLES.length);
  });

  it('never returns a number without a puzzle', () => {
    for (let d = 0; d < 400; d++) {
      const date = new Date(Date.UTC(2026, 7, 17 + d));
      expect(puzzleByNumber(todaysPuzzleNumber(date))).toBeDefined();
    }
  });
});
