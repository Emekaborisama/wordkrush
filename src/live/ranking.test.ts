import { describe, expect, it } from 'vitest';
import { rankMatchScores } from './ranking';

describe('rankMatchScores', () => {
  it('ranks More or Less by highest streak', () => {
    const ranked = rankMatchScores('more-or-less', [
      { playerId: 'a', score: 8, complete: true },
      { playerId: 'b', score: 12, complete: false },
      { playerId: 'c', score: 8, complete: false },
    ]);
    expect(ranked.map((row) => row.playerId)).toEqual(['b', 'a', 'c']);
  });

  it('ranks Clueless solvers by fewest guesses and leaves non-solvers last', () => {
    const ranked = rankMatchScores('clueless', [
      { playerId: 'slow', score: 20, complete: true },
      { playerId: 'miss', score: 40, complete: false },
      { playerId: 'fast', score: 6, complete: true },
    ]);
    expect(ranked.map((row) => row.playerId)).toEqual(['fast', 'slow', 'miss']);
  });

  it('ranks Wordfall wins above losses, then by points', () => {
    const ranked = rankMatchScores('wordfall', [
      { playerId: 'loss-high', score: 9000, complete: false },
      { playerId: 'win-low', score: 400, complete: true },
      { playerId: 'win-high', score: 800, complete: true },
    ]);
    expect(ranked.map((row) => row.playerId)).toEqual(['win-high', 'win-low', 'loss-high']);
  });
});
