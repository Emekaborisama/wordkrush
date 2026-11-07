/**
 * The Wikidata metrics More or Less can ask about, and the rule that turns a
 * property's statements into the ONE number a card shows.
 *
 * Pure: no network, no file system. The rule is the part of the Wikidata
 * pipeline most likely to be quietly wrong, so it is the part with the most
 * tests, built from statements seen on real items:
 *
 *  - Russia's area has a deprecated statement (the figure with Crimea);
 *  - Everest has six elevations, one of them preferred;
 *  - the Nile has a preferred 6,650 km and a normal 2,850 km;
 *  - the US has a GDP per year and none of them preferred.
 *
 * THE RULE, in order:
 *  1. Drop deprecated statements, non-positive amounts and wrong units.
 *  2. If any statement is preferred, keep only the preferred ones. Editors
 *     mark the agreed figure this way, and it settles all four cases above.
 *  3. Otherwise keep the statements with no "applies to part" qualifier (a
 *     total, not the land area or one country's stretch), if there are any.
 *  4. For a metric that changes over time, keep the newest dated statement(s).
 *  5. If what is left disagrees by more than the 1.15× fairness guard, the
 *     item is DISPUTED and left out: the game must never ask a question whose
 *     answer depends on which source you believe. Otherwise take the median.
 */
import { FAIRNESS_MIN_RATIO } from '../src/games/more-or-less/pairing';
import type { Category } from '../src/games/more-or-less/types';
import type { Statement } from './sources/wikidata';

export const METRIC_IDS = ['population', 'area', 'elevation', 'length', 'height'] as const;
export type MetricId = (typeof METRIC_IDS)[number];

/** Unit item ids. */
export const UNIT = {
  one: 'Q199',
  metre: 'Q11573',
  squareMetre: 'Q25343',
} as const;

export type MetricSpec = {
  property: string;
  /** Read Wikidata's SI-normalised amount (psn:), so feet arrive as metres. */
  normalized: boolean;
  /** Accepted units, after normalisation. */
  units: readonly string[];
  /** Shipped value = amount × scale (m² → km², m → km). */
  scale: number;
  /** Decimal places kept in the shipped value. */
  decimals: number;
  /** The value changes over time: the newest dated statement wins. */
  timeSeries: boolean;
  /** The kind of quantity, for the category file. */
  unit: Category['unit'];
};

export const METRICS: Readonly<Record<MetricId, MetricSpec>> = {
  population: { property: 'P1082', normalized: false, units: [UNIT.one], scale: 1, decimals: 0, timeSeries: true, unit: 'count' },
  area: { property: 'P2046', normalized: true, units: [UNIT.squareMetre], scale: 1e-6, decimals: 2, timeSeries: false, unit: 'area' },
  elevation: { property: 'P2044', normalized: true, units: [UNIT.metre], scale: 1, decimals: 0, timeSeries: false, unit: 'length' },
  length: { property: 'P2043', normalized: true, units: [UNIT.metre], scale: 1e-3, decimals: 0, timeSeries: false, unit: 'length' },
  height: { property: 'P2048', normalized: true, units: [UNIT.metre], scale: 1, decimals: 0, timeSeries: false, unit: 'length' },
};

export function isMetricId(value: unknown): value is MetricId {
  return typeof value === 'string' && (METRIC_IDS as readonly string[]).includes(value);
}

/** Candidate values may disagree by less than this and still be one fact. */
export const MAX_DISAGREEMENT = FAIRNESS_MIN_RATIO;

export type Selection =
  | { ok: true; value: number; pointInTime?: string; from: number }
  | { ok: false; reason: 'missing' | 'disputed'; values: number[] };

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function roundTo(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

export function selectValue(statements: readonly Statement[], spec: MetricSpec): Selection {
  // 1. What could possibly be the answer.
  let candidates = statements.filter(
    (s) => s.rank !== 'deprecated' && Number.isFinite(s.amount) && s.amount > 0 && spec.units.includes(s.unit),
  );
  if (candidates.length === 0) return { ok: false, reason: 'missing', values: [] };

  // 2. The figure editors agreed on.
  const preferred = candidates.filter((s) => s.rank === 'preferred');
  if (preferred.length > 0) {
    candidates = preferred;
  } else {
    // 3. A total rather than a part.
    const whole = candidates.filter((s) => s.parts.length === 0);
    if (whole.length > 0) candidates = whole;
  }

  // 4. The newest figure, for a quantity that moves.
  let pointInTime: string | undefined;
  if (spec.timeSeries) {
    const dated = candidates.filter((s) => s.pointInTime !== undefined);
    if (dated.length > 0) {
      pointInTime = dated.reduce((latest, s) => (s.pointInTime! > latest ? s.pointInTime! : latest), dated[0].pointInTime!);
      candidates = dated.filter((s) => s.pointInTime === pointInTime);
    }
  }

  // 5. One fact, or a dispute.
  const values = candidates.map((s) => roundTo(s.amount * spec.scale, spec.decimals));
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (low <= 0) return { ok: false, reason: 'missing', values };
  if (high / low > MAX_DISAGREEMENT) return { ok: false, reason: 'disputed', values };
  const value = roundTo(median(values), spec.decimals);
  if (value <= 0) return { ok: false, reason: 'missing', values };
  return { ok: true, value, from: candidates.length, ...(pointInTime ? { pointInTime } : {}) };
}
