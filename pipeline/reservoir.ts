/**
 * Wikipedia popularity keyword reservoir — pipeline only, never bundled.
 *
 * Play reads queued rounds in the category snapshot. This file is the larger
 * list those rounds are sampled from. Filters exist so Wikimedia's top-pages
 * feed (Main Page, porn, death lists, namespaces) cannot become a card.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ROUND_SIZE = 25;
export const ROUND_CANDIDATE_POOL = 40;
export const RESERVOIR_TARGET = 20_000;

export type ReservoirTerm = {
  label: string;
  term: string;
};

export type ReservoirFile = {
  generatedAt: string;
  source: string;
  target: number;
  items: ReservoirTerm[];
};

const NAMESPACE_PREFIX =
  /^(Wikipedia|Special|File|Draft|Template|Help|Portal|MediaWiki|Category|Module|TimedText|User|Talk|WP|MOS|Media):/i;

const ADULT =
  /\b(pornhub|xvideos|xnxx|xhamster|youporn|redtube|chaturbate|onlyfans|spankbang|xvideos|porn|hentai|rule34|nhentai|xxx)\b/i;

const BARE_YEAR = /^[12]\d{3}$/;

/**
 * Titles Wikimedia's top list returns that are not playable encyclopedic items.
 * Underscores or spaces are both accepted.
 */
export function isPlayableReservoirTerm(raw: string): boolean {
  const title = decodeArticleTitle(raw).trim();
  if (title.length < 2) return false;
  if (title === '-' || title === 'Main Page') return false;
  if (NAMESPACE_PREFIX.test(title)) return false;
  if (BARE_YEAR.test(title)) return false;
  if (/^Deaths in /i.test(title)) return false;
  if (/^List of /i.test(title)) return false;
  if (/\(disambiguation\)$/i.test(title)) return false;
  if (ADULT.test(title)) return false;
  if (/^(404\.php|index\.php|Search)$/i.test(title)) return false;
  return true;
}

/** Wikimedia top-pages use underscores; our keyword `term` is the article title. */
export function decodeArticleTitle(raw: string): string {
  return raw.replace(/_/g, ' ');
}

export function toReservoirTerm(raw: string): ReservoirTerm | null {
  if (!isPlayableReservoirTerm(raw)) return null;
  const term = decodeArticleTitle(raw).trim();
  return { label: term, term };
}

export function uniqueTerms(terms: ReservoirTerm[]): ReservoirTerm[] {
  const seen = new Set<string>();
  const out: ReservoirTerm[] = [];
  for (const item of terms) {
    const key = item.term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Rank by how often a title appeared in the top lists, then alphabetically. */
export function rankReservoir(
  appearances: Map<string, number>,
  extras: ReservoirTerm[] = [],
): ReservoirTerm[] {
  const ranked = [...appearances.entries()]
    .map(([term, count]) => ({ term, count, item: toReservoirTerm(term) }))
    .filter((row): row is { term: string; count: number; item: ReservoirTerm } => row.item !== null)
    .sort((a, b) => b.count - a.count || a.item.term.localeCompare(b.item.term))
    .map((row) => row.item);
  return uniqueTerms([...extras, ...ranked]);
}

export function reservoirPath(): string {
  return fileURLToPath(new URL('./keywords/wikipedia-popularity-reservoir.json', import.meta.url));
}

export function loadReservoir(): ReservoirFile {
  return JSON.parse(readFileSync(reservoirPath(), 'utf8')) as ReservoirFile;
}

export function unusedTerms(
  reservoir: ReservoirTerm[],
  usedIds: ReadonlySet<string>,
  idForTerm: (term: string) => string,
): ReservoirTerm[] {
  return reservoir.filter((item) => !usedIds.has(idForTerm(item.term)));
}

/**
 * Seeded Fisher–Yates. Same seed + list → same sample, so a weekly job is
 * replayable without storing which titles it almost picked.
 */
export function sampleRound(
  unused: ReservoirTerm[],
  seed: number,
  size: number,
): ReservoirTerm[] {
  if (size <= 0 || unused.length === 0) return [];
  const shuffled = [...unused];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    const [index, next] = nextInt(s, i + 1);
    s = next;
    const current = shuffled[i];
    const swap = shuffled[index];
    if (current === undefined || swap === undefined) continue;
    shuffled[i] = swap;
    shuffled[index] = current;
  }
  return shuffled.slice(0, Math.min(size, shuffled.length));
}

/** ISO week id used as a round id, e.g. `round-2026-W35`. */
export function isoWeekRoundId(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `round-${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function seedFromRoundId(roundId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < roundId.length; i++) {
    hash ^= roundId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextInt(seed: number, max: number): [number, number] {
  let s = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [Math.floor(value * max), s];
}
