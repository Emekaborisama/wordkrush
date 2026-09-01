/**
 * Bundled Clueless puzzles.
 *
 * Metro requires static imports, so every puzzle is listed explicitly. That
 * also means all of it ships with the app and the game works with no network —
 * the same offline guarantee as WordKrush comparison (docs/STACK.md D-004).
 *
 * Build the initial corpus with:
 *   cd validator && uv run python -m app.clueless.build --words <list> --puzzles N
 *
 * Append one reviewed future level with:
 *   cd validator && uv run python -m app.clueless.build --append-secret <word>
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
import p31 from './0031.json';
import p32 from './0032.json';
import p33 from './0033.json';
import p34 from './0034.json';
import p35 from './0035.json';
import p36 from './0036.json';
import p37 from './0037.json';
import p38 from './0038.json';
import p39 from './0039.json';
import p40 from './0040.json';
import p41 from './0041.json';
import p42 from './0042.json';
import p43 from './0043.json';
import p44 from './0044.json';
import p45 from './0045.json';
import p46 from './0046.json';
import p47 from './0047.json';
import p48 from './0048.json';
import p49 from './0049.json';
import p50 from './0050.json';
import p51 from './0051.json';
import p52 from './0052.json';
import p53 from './0053.json';
import p54 from './0054.json';
import p55 from './0055.json';
import p56 from './0056.json';
import p57 from './0057.json';
import p58 from './0058.json';
import p59 from './0059.json';
import p60 from './0060.json';
import p61 from './0061.json';

export { CLUELESS_HINTS, hintForPuzzle } from './hints';

export const PUZZLES: Puzzle[] = [
  p01, p02, p03, p04, p05, p06, p07, p08, p09, p10,
  p11, p12, p13, p14, p15, p16, p17, p18, p19, p20,
  p21, p22, p23, p24, p25, p26, p27, p28, p29, p30,
  p31, p32, p33, p34, p35, p36, p37, p38, p39, p40,
  p41, p42, p43, p44, p45,
  p46, p47, p48, p49, p50, p51, p52, p53,
  p54, p55, p56, p57, p58, p59, p60, p61,
] as Puzzle[];

export const VOCABULARY: string[] = vocabData as string[];

/** Puzzles are numbered from 1; the array is 0-indexed. */
export function puzzleByNumber(n: number): Puzzle | undefined {
  return PUZZLES[n - 1];
}

/**
 * Legacy UTC-day selector retained only to identify pre-path saved sessions.
 * New solo play uses `src/games/clueless/path.ts` and level metadata instead.
 */
export function todaysPuzzleNumber(date = new Date()): number {
  const epoch = Date.UTC(2026, 7, 17); // 2026-08-17, puzzle #1
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const days = Math.floor((today - epoch) / 86_400_000);
  return (((days % PUZZLES.length) + PUZZLES.length) % PUZZLES.length) + 1;
}
