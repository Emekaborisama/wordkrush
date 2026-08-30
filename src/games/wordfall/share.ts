/**
 * Spoiler-free Wordfall result paste.
 *
 * One square per word found, tinted by length so a board cleared with long
 * words looks different from one grinding out threes. Never `played[]` —
 * levels are numbered and shared, so the words themselves are spoilers.
 */
import { wordLengthBucket } from '../../analytics/events';
import { composeShare, wrapSquares } from '../share';

const LENGTH_SQUARE = {
  under_3: '🟦',
  '3_4': '🟦',
  '5_7': '🟨',
  '8_plus': '🟩',
} as const;

export type WordfallShareInput = {
  levelNumber: number;
  levelName: string;
  score: number;
  wordLengths: number[];
  elapsedMs: number;
  won: boolean;
};

export function buildShareText(input: WordfallShareInput): string {
  const words = input.wordLengths.length;
  return composeShare({
    title: `WordKrush · Wordfall L${input.levelNumber} “${input.levelName}”`,
    grid: wrapSquares(input.wordLengths.map(squareForLength).join('')),
    standing: `${formatScore(input.score)} pts · ${words} ${words === 1 ? 'word' : 'words'} · ${formatShareDuration(input.elapsedMs)}`,
    verdict: input.won ? undefined : 'Almost there.',
  });
}

function squareForLength(length: number): string {
  return LENGTH_SQUARE[wordLengthBucket(length)];
}

function formatScore(score: number): string {
  return score.toLocaleString('en-US');
}

/**
 * Same `m:ss` rule as `formatDuration` in `src/ui/theme.ts`, kept here so
 * the formatter never imports UI.
 */
function formatShareDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
