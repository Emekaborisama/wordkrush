import { describe, expect, it } from 'vitest';
import { chainStamp, ghostsFromCleared, playJuiceKey } from './clearJuice';

const tile = (id: number, letter: string, crate = false) => ({ id, letter, crate });

describe('ghostsFromCleared', () => {
  it('keeps the letter that occupied each cleared index on the previous board', () => {
    const previous = [tile(1, 'c'), tile(2, 'a'), tile(3, 't')];
    expect(ghostsFromCleared(previous, [0, 2])).toEqual([
      { key: '1', index: 0, letter: 'c', crate: false },
      { key: '3', index: 2, letter: 't', crate: false },
    ]);
  });

  it('dedupes indices and skips holes so a chain cannot spawn two ghosts on one cell', () => {
    const previous = [tile(1, 'x'), tile(2, '?', true)];
    expect(ghostsFromCleared(previous, [1, 1, 9])).toEqual([
      { key: '2', index: 1, letter: '?', crate: true },
    ]);
  });
});

describe('chainStamp', () => {
  it('stays quiet on a single-word clear', () => {
    expect(chainStamp(1)).toBeNull();
    expect(chainStamp(0)).toBeNull();
  });

  it('uses our words, not King juice copy', () => {
    expect(chainStamp(2)).toBe('CRUSH');
    expect(chainStamp(4)).toBe('NOVA');
  });
});

describe('playJuiceKey', () => {
  it('changes when the cleared set or created special changes', () => {
    const base = { word: 'cat', cleared: [1, 2], chain: 1, created: null };
    expect(playJuiceKey(base)).not.toBe(playJuiceKey({ ...base, cleared: [1, 3] }));
    expect(playJuiceKey(base)).not.toBe(
      playJuiceKey({ ...base, created: { index: 4 } }),
    );
  });
});
