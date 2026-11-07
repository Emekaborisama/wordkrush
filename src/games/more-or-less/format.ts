/**
 * How a More or Less number reads on a card, and whose number it is.
 *
 * Pure: no React, no platform APIs. The screens call these; the tests pin
 * them, because a value that reads wrong is a wrong answer as far as the
 * player is concerned.
 */
import type { ValueDisplay } from './types';

/** Values from here up are written as 3 significant figures with a suffix. */
export const COMPACT_FROM = 100_000;

const STEPS: ReadonlyArray<readonly [number, string]> = [
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

function compactNumber(value: number): string {
  for (const [size, suffix] of STEPS) {
    if (value >= size) {
      // Three significant figures: enough to tell apart any two values the
      // 1.15× fairness guard lets the game ask about, short enough for a
      // half-width card on a small phone.
      const scaled = (value / size).toLocaleString('en-US', { maximumSignificantDigits: 3 });
      return `${scaled}${suffix}`;
    }
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/**
 * Writes a value the way its category says. Without a `display` this is the
 * grouped integer the cards have always shown ("381,811"), so the pageview
 * categories read exactly as before.
 */
export function formatMetric(value: number, display?: ValueDisplay): string {
  if (!Number.isFinite(value)) return '—';
  if (!display) return Math.round(value).toLocaleString('en-US');
  const decimals = display.decimals ?? 0;
  const magnitude = Math.abs(value);
  const body =
    display.compact && magnitude >= COMPACT_FROM
      ? compactNumber(magnitude)
      : magnitude.toLocaleString('en-US', { maximumFractionDigits: decimals });
  const sign = value < 0 ? '-' : '';
  return `${sign}${display.prefix ?? ''}${body}${display.suffix ?? ''}`;
}

/** The name of the source a value came from, for the line under the cards. */
export function sourceName(source: string | undefined): string {
  if (!source) return '';
  if (source.startsWith('wikipedia')) return 'Wikipedia';
  if (source.startsWith('wikidata')) return 'Wikidata';
  return source;
}
