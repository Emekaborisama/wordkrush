import { describe, expect, it } from 'vitest';
import { DICTIONARY, LEVELS } from '../../data/wordfall';
import {
  areAdjacent,
  colOf,
  createLetterBag,
  createSolver,
  drawLetter,
  effectArea,
  findWords,
  generateBoard,
  indexAt,
  isPlayable,
  neighbors,
  orthogonalNeighbors,
  reshuffle,
  rowOf,
  settle,
} from './board';
import type { Board, Tile } from './types';

const bag = createLetterBag(DICTIONARY.letterWeights);
const solver = createSolver(DICTIONARY);

/** Builds a board from rows of letters, so tests read like the thing they test. */
function boardFrom(rows: string[]): Board {
  const width = rows[0].length;
  const tiles: Tile[] = [];
  let id = 1;
  for (const row of rows) {
    expect(row.length, 'every row must be the same width').toBe(width);
    for (const letter of row) {
      tiles.push({ id: id++, letter, special: null, crate: false });
    }
  }
  return { width, height: rows.length, tiles };
}

const letters = (board: Board): string[] => {
  const rows: string[] = [];
  for (let r = 0; r < board.height; r++) {
    let row = '';
    for (let c = 0; c < board.width; c++) row += board.tiles[indexAt(board, r, c)].letter;
    rows.push(row);
  }
  return rows;
};

describe('geometry', () => {
  const board = boardFrom(['abc', 'def', 'ghi']);

  it('maps indices to rows and columns', () => {
    expect(rowOf(board, 4)).toBe(1);
    expect(colOf(board, 4)).toBe(1);
    expect(indexAt(board, 2, 1)).toBe(7);
  });

  it('gives a centre cell eight neighbours and a corner three', () => {
    expect(neighbors(board, 4)).toHaveLength(8);
    expect(neighbors(board, 0)).toHaveLength(3);
  });

  it('treats diagonals as adjacent, so most words are traceable', () => {
    expect(areAdjacent(board, 0, 4)).toBe(true);
    expect(areAdjacent(board, 0, 8)).toBe(false);
    // A tile is never adjacent to itself, or a trace could reuse it.
    expect(areAdjacent(board, 4, 4)).toBe(false);
  });

  it('limits crate contact to the four edges', () => {
    expect(orthogonalNeighbors(board, 4).sort()).toEqual([1, 3, 5, 7]);
  });
});

describe('effectArea', () => {
  const board = boardFrom(['abcde', 'fghij', 'klmno', 'pqrst', 'uvwxy']);
  const centre = indexAt(board, 2, 2);

  it('beam clears its row and column, and nothing else', () => {
    const area = new Set(effectArea(board, centre, 'beam'));
    expect(area.size).toBe(9); // 5 + 5 - 1 shared
    expect(area.has(indexAt(board, 2, 0))).toBe(true);
    expect(area.has(indexAt(board, 0, 2))).toBe(true);
    expect(area.has(indexAt(board, 1, 1))).toBe(false);
  });

  it('nova clears the surrounding block', () => {
    const area = new Set(effectArea(board, centre, 'nova'));
    expect(area.size).toBe(9);
    expect(area.has(indexAt(board, 1, 1))).toBe(true);
    expect(area.has(indexAt(board, 0, 2))).toBe(false);
  });

  it('flare clears both diagonals', () => {
    const area = new Set(effectArea(board, centre, 'flare'));
    expect(area.has(indexAt(board, 0, 0))).toBe(true);
    expect(area.has(indexAt(board, 4, 4))).toBe(true);
    expect(area.has(indexAt(board, 0, 4))).toBe(true);
    expect(area.has(indexAt(board, 4, 0))).toBe(true);
    // Not the row or column.
    expect(area.has(indexAt(board, 2, 0))).toBe(false);
  });

  it('ember clears every tile sharing its letter, wherever they are', () => {
    const repeated = boardFrom(['aba', 'bab', 'aba']);
    const area = new Set(effectArea(repeated, 0, 'ember'));
    expect(area.size).toBe(5);
    for (const i of area) expect(repeated.tiles[i].letter).toBe('a');
  });

  it('stays inside the board at the edges', () => {
    for (const kind of ['beam', 'nova', 'flare', 'ember'] as const) {
      for (const index of [0, 4, 20, 24]) {
        for (const target of effectArea(board, index, kind)) {
          expect(target).toBeGreaterThanOrEqual(0);
          expect(target).toBeLessThan(board.tiles.length);
        }
      }
    }
  });
});

describe('findWords', () => {
  it('finds a word traced through adjacent tiles', () => {
    const board = boardFrom(['sto', 'xne', 'xxx']);
    expect(findWords(board, solver)).toContain('stone');
  });

  it('will not reuse a tile within one word', () => {
    // "sos" needs the single S twice; there is no second one.
    const board = boardFrom(['so', 'xx']);
    expect(findWords(board, solver)).not.toContain('sos');
  });

  it('cannot trace through a crate', () => {
    const open = boardFrom(['sto', 'xne', 'xxx']);
    expect(findWords(open, solver)).toContain('stone');

    const blocked: Board = {
      ...open,
      tiles: open.tiles.map((t, i) => (i === 1 ? { ...t, crate: true } : t)),
    };
    expect(findWords(blocked, solver)).not.toContain('stone');
  });

  it('stops early once the limit is reached', () => {
    const board = generateBoard(LEVELS[0], bag, solver, 12345, 7, 8).board;
    expect(findWords(board, solver, 3)).toHaveLength(3);
  });
});

describe('generateBoard', () => {
  it('always produces a full, playable board', () => {
    // Many seeds, because "playable" is a property of the generator, not of one
    // lucky board. A dead opening board is the one bug a player cannot work
    // around.
    for (let seed = 1; seed <= 40; seed++) {
      const { board } = generateBoard(LEVELS[0], bag, solver, seed * 7919, 7, 8);
      expect(board.tiles).toHaveLength(56);
      expect(board.tiles.every((t) => /^[a-z]$/.test(t.letter))).toBe(true);
      expect(isPlayable(board, solver), `seed ${seed}`).toBe(true);
    }
  });

  it('offers a real choice of openings, not just one word', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { board } = generateBoard(LEVELS[0], bag, solver, seed * 104729, 7, 8);
      expect(findWords(board, solver, 10).length).toBeGreaterThanOrEqual(8);
    }
  });

  it('is deterministic for a seed', () => {
    const a = generateBoard(LEVELS[0], bag, solver, 4242, 7, 8);
    const b = generateBoard(LEVELS[0], bag, solver, 4242, 7, 8);
    expect(letters(a.board)).toEqual(letters(b.board));
    expect(a.seed).toBe(b.seed);
  });

  it('seeds the requested number of crates, never on the bottom row', () => {
    const level = LEVELS.find((l) => l.crates > 0)!;
    const { board } = generateBoard(level, bag, solver, 999, 7, 8);
    const crates = board.tiles.filter((t) => t.crate);
    expect(crates).toHaveLength(level.crates);
    for (let c = 0; c < board.width; c++) {
      expect(board.tiles[indexAt(board, board.height - 1, c)].crate).toBe(false);
    }
  });

  it('gives every tile a unique id', () => {
    const { board } = generateBoard(LEVELS[0], bag, solver, 77, 7, 8);
    expect(new Set(board.tiles.map((t) => t.id)).size).toBe(board.tiles.length);
  });
});

describe('settle', () => {
  it('drops survivors and refills from the top', () => {
    const board = boardFrom(['abc', 'def', 'ghi']);
    const cleared = new Set([indexAt(board, 2, 0)]); // 'g', bottom-left
    const { board: next } = settle(board, cleared, bag, 1, 100);

    // The column above collapses down; the top cell is new.
    expect(next.tiles[indexAt(next, 2, 0)].letter).toBe('d');
    expect(next.tiles[indexAt(next, 1, 0)].letter).toBe('a');
    expect(next.tiles[indexAt(next, 0, 0)].id).toBeGreaterThanOrEqual(100);
    // Untouched columns are untouched.
    expect(next.tiles[indexAt(next, 2, 1)].letter).toBe('h');
  });

  it('keeps survivor ids so the UI can animate the fall', () => {
    const board = boardFrom(['abc', 'def', 'ghi']);
    const survivorId = board.tiles[indexAt(board, 0, 0)].id;
    const { board: next } = settle(board, new Set([indexAt(board, 2, 0)]), bag, 1, 100);
    expect(next.tiles[indexAt(next, 1, 0)].id).toBe(survivorId);
  });

  it('always returns a full board', () => {
    const board = boardFrom(['abc', 'def', 'ghi']);
    const all = new Set(board.tiles.map((_, i) => i));
    const { board: next } = settle(board, all, bag, 5, 100);
    expect(next.tiles).toHaveLength(9);
    expect(next.tiles.every((t) => /^[a-z]$/.test(t.letter))).toBe(true);
    expect(new Set(next.tiles.map((t) => t.id)).size).toBe(9);
  });

  it('carries specials down with their tile', () => {
    const board = boardFrom(['abc', 'def', 'ghi']);
    const withSpecial: Board = {
      ...board,
      tiles: board.tiles.map((t, i) => (i === 0 ? { ...t, special: 'nova' as const } : t)),
    };
    const { board: next } = settle(withSpecial, new Set([indexAt(board, 2, 0)]), bag, 1, 100);
    expect(next.tiles[indexAt(next, 1, 0)].special).toBe('nova');
  });
});

describe('reshuffle', () => {
  it('changes letters but keeps crates and specials in place', () => {
    const board = boardFrom(['abc', 'def', 'ghi']);
    const seeded: Board = {
      ...board,
      tiles: board.tiles.map((t, i) =>
        i === 0 ? { ...t, crate: true } : i === 4 ? { ...t, special: 'beam' as const } : t,
      ),
    };
    const { board: next } = reshuffle(seeded, bag, 31337);

    expect(next.tiles[0].crate).toBe(true);
    expect(next.tiles[0].letter).toBe('a'); // crates keep their face
    expect(next.tiles[4].special).toBe('beam');
    expect(letters(next)).not.toEqual(letters(seeded));
  });
});

describe('drawLetter', () => {
  it('is deterministic and stays inside the alphabet', () => {
    expect(drawLetter(bag, 99)).toEqual(drawLetter(bag, 99));
    let seed = 1;
    for (let i = 0; i < 500; i++) {
      const [letter, next] = drawLetter(bag, seed);
      expect(letter).toMatch(/^[a-z]$/);
      seed = next;
    }
  });

  it('follows the measured distribution rather than dealing uniformly', () => {
    let seed = 7;
    const counts = new Map<string, number>();
    for (let i = 0; i < 20000; i++) {
      const [letter, next] = drawLetter(bag, seed);
      counts.set(letter, (counts.get(letter) ?? 0) + 1);
      seed = next;
    }
    // E is the commonest letter in English by a wide margin; Z is near the
    // bottom. If these came out level, the bag is ignoring its weights.
    expect(counts.get('e')!).toBeGreaterThan(counts.get('z')! * 10);
    const vowels = ['a', 'e', 'i', 'o', 'u'].reduce((n, v) => n + (counts.get(v) ?? 0), 0);
    expect(vowels / 20000).toBeGreaterThan(0.3);
  });
});
