/**
 * Bundled Clueless puzzles.
 *
 * Metro requires static imports, so every puzzle is listed explicitly. That
 * also means all of it ships with the app and the game works with no network —
 * the same offline guarantee as WordCrush comparison (docs/STACK.md D-004).
 *
 * Regenerate with:
 *   cd validator && uv run python -m app.clueless.build --words <list> --puzzles N
 */
import type { Puzzle } from '../../games/clueless/types';
import vocabData from './vocab.json';
import p01 from './0001.json';
import p02 from './0002.json';
import p03 from './0003.json';
import p04 from './0004.json';
import p05 from './0005.json';
import p06 from './0006.json';
import p07 from './0007.json';
import p08 from './0008.json';
import p09 from './0009.json';
import p10 from './0010.json';
import p11 from './0011.json';
import p12 from './0012.json';
import p13 from './0013.json';
import p14 from './0014.json';
import p15 from './0015.json';
import p16 from './0016.json';
import p17 from './0017.json';
import p18 from './0018.json';
import p19 from './0019.json';
import p20 from './0020.json';
import p21 from './0021.json';
import p22 from './0022.json';
import p23 from './0023.json';
import p24 from './0024.json';
import p25 from './0025.json';
import p26 from './0026.json';
import p27 from './0027.json';
import p28 from './0028.json';
import p29 from './0029.json';
import p30 from './0030.json';

export const PUZZLES: Puzzle[] = [
  p01, p02, p03, p04, p05, p06, p07, p08, p09, p10,
  p11, p12, p13, p14, p15, p16, p17, p18, p19, p20,
  p21, p22, p23, p24, p25, p26, p27, p28, p29, p30,
] as Puzzle[];

export const VOCABULARY: string[] = vocabData as string[];

/** Puzzles are numbered from 1; the array is 0-indexed. */
export function puzzleByNumber(n: number): Puzzle | undefined {
  return PUZZLES[n - 1];
}

/**
 * Which puzzle "today" is.
 *
 * Wraps once the set is exhausted rather than running out — a player who finds
 * the app after the puzzles run dry should still get a game, not an error.
 * Replacing this with a real daily schedule is a content decision, not a code
 * one (see the roadmap).
 */
export function todaysPuzzleNumber(date = new Date()): number {
  const epoch = Date.UTC(2026, 7, 17); // 2026-08-17, puzzle #1
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const days = Math.floor((today - epoch) / 86_400_000);
  return (((days % PUZZLES.length) + PUZZLES.length) % PUZZLES.length) + 1;
}
