/**
 * Build the Wikipedia popularity keyword reservoir from Wikimedia top-pages.
 *
 *     npm run pipeline:reservoir
 *
 * Output is pipeline/keywords/wikipedia-popularity-reservoir.json — not shipped
 * in the app. The weekly rotate job samples a playable round from this list.
 */
import { writeFileSync } from 'node:fs';
import { loadKeywordFile } from './wikipedia-snapshot';
import {
  RESERVOIR_TARGET,
  rankReservoir,
  reservoirPath,
  uniqueTerms,
  type ReservoirFile,
  type ReservoirTerm,
} from './reservoir';

const USER_AGENT = 'wordkrush/0.1 (https://wordkrush.com)';
const TOP = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access';
const MONTHS = 36;
const DAYS = 90;
const CONCURRENCY = 1;
const RETRY_MS = 1500;
const GAP_MS = 250;

type TopResponse = {
  items?: { articles?: { article: string }[] }[];
};

async function fetchTop(path: string): Promise<string[]> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(`${TOP}/${path}`, { headers: { 'User-Agent': USER_AGENT } });
    if (res.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_MS * (attempt + 1)));
      continue;
    }
    if (res.status === 404) return [];
    if (!res.ok) {
      throw new Error(`Wikimedia top ${res.status} for ${path}: ${await res.text()}`);
    }
    const body = (await res.json()) as TopResponse;
    await new Promise((resolve) => setTimeout(resolve, GAP_MS));
    return (body.items?.[0]?.articles ?? []).map((row) => row.article);
  }
  throw new Error(`Wikimedia top 429 for ${path} after retries`);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function monthPaths(now: Date, count: number): string[] {
  const paths: string[] = [];
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  // Skip the in-progress month — Wikimedia's monthly top is incomplete.
  cursor.setUTCMonth(cursor.getUTCMonth() - 1);
  for (let i = 0; i < count; i++) {
    paths.push(`${cursor.getUTCFullYear()}/${pad(cursor.getUTCMonth() + 1)}`);
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
  }
  return paths;
}

function dayPaths(now: Date, count: number): string[] {
  const paths: string[] = [];
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  for (let i = 0; i < count; i++) {
    paths.push(
      `${cursor.getUTCFullYear()}/${pad(cursor.getUTCMonth() + 1)}/${pad(cursor.getUTCDate())}`,
    );
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return paths;
}

async function fetchAll(paths: string[]): Promise<Map<string, number>> {
  const appearances = new Map<string, number>();
  const queue = [...paths];

  async function worker() {
    for (;;) {
      const path = queue.shift();
      if (path === undefined) return;
      const articles = await fetchTop(path);
      for (const article of articles) {
        appearances.set(article, (appearances.get(article) ?? 0) + 1);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, paths.length) }, worker));
  return appearances;
}

function mergeAppearances(parts: Map<string, number>[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const part of parts) {
    for (const [article, count] of part) {
      out.set(article, (out.get(article) ?? 0) + count);
    }
  }
  return out;
}

async function main() {
  const now = new Date();
  const months = monthPaths(now, MONTHS);
  const days = dayPaths(now, DAYS);
  console.log(`reservoir: ${months.length} months + ${days.length} days of Wikimedia tops`);

  const appearances = mergeAppearances([await fetchAll(months), await fetchAll(days)]);
  const curated: ReservoirTerm[] = loadKeywordFile('wikipedia-popularity').items;
  const ranked = rankReservoir(appearances, curated);
  const items = uniqueTerms(ranked).slice(0, RESERVOIR_TARGET);

  const file: ReservoirFile = {
    generatedAt: now.toISOString().slice(0, 10),
    source: `wikimedia-top:en.wikipedia:${MONTHS}m+${DAYS}d`,
    target: RESERVOIR_TARGET,
    items,
  };
  writeFileSync(reservoirPath(), JSON.stringify(file, null, 2) + '\n');
  console.log(`wrote ${items.length} terms -> ${reservoirPath()}`);
  if (items.length < RESERVOIR_TARGET) {
    console.log(
      `short of ${RESERVOIR_TARGET}: shipping the clean unique count rather than padding.`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
