import type { VolumeSource } from './types';

/**
 * Wikimedia pageviews source — MEASURED monthly pageviews per article.
 *
 * Unlike keyword-volume providers, this is not an estimate: it is an actual
 * count published by the organisation that runs the servers. Free, no auth,
 * clean licensing (STACK D-012).
 *
 * IMPORTANT: pageviews measure ENCYCLOPEDIC interest, not commercial search
 * intent. "Pizza" as a Google query is dominated by "pizza near me", which
 * never touches the Wikipedia article. The metric must therefore be labelled
 * "monthly Wikipedia pageviews" and never "Google searches".
 *
 * `terms` here are exact Wikipedia ARTICLE TITLES (see
 * pipeline/keywords/wikipedia-popularity.json), already resolved through
 * redirects. Passing an unresolved search phrase will 404.
 */

const API = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article';

// Wikimedia asks for a descriptive User-Agent identifying the client, and
// rate-limits/blocks generic ones. https://wikimedia.org/api/rest_v1/
const USER_AGENT = 'wordkrush/0.1 (https://wordkrush.com)';

// Wikimedia's published limit is 200 req/s; we stay far under it deliberately.
// Content builds are not latency-sensitive and being a good API citizen costs
// us nothing here.
const CONCURRENCY = 4;

export type WikipediaSourceOptions = {
  /** Inclusive start, YYYYMMDD. Must be the first of a month for monthly granularity. */
  start?: string;
  /** Exclusive-ish end, YYYYMMDD. */
  end?: string;
  /** 'user' excludes bots and spiders — essential, or crawler traffic skews everything. */
  agent?: 'user' | 'all-agents';
};

export function defaultWindow(): { start: string; end: string } {
  // Trailing 6 COMPLETE months, ending on the last day of last month.
  //
  // The current month must be excluded: Wikimedia returns a partial count for
  // a month in progress, and averaging that in silently deflates every item
  // by an amount that depends on what day the snapshot was taken.
  const now = new Date();
  // Last day of the previous month.
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  // First day of the month 6 months before that.
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 5, 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
  return { start: fmt(start), end: fmt(end) };
}

/**
 * Median monthly views, not mean.
 *
 * Pageviews are extremely spiky: a biopic release, a World Cup, a death, or a
 * scandal can push an article 10x for a month or two. The mean lets one such
 * event define an item's value for the whole window, so the same pair reads
 * completely differently depending on when the snapshot ran. The median
 * reports the item's typical month and ignores the tail.
 */
export function median(values: number[]): number {
  if (values.length === 0) throw new Error('median() of empty array');
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Wikipedia titles use underscores in URLs, and must be encoded (accents, slashes, &). */
export function encodeArticle(title: string): string {
  return encodeURIComponent(title.replace(/ /g, '_'));
}

export function createWikipediaSource(options: WikipediaSourceOptions = {}): VolumeSource {
  const { start, end } = { ...defaultWindow(), ...options };
  const agent = options.agent ?? 'user';

  return {
    name: `wikipedia-pageviews:${start}-${end}`,

    async fetchVolumes(terms: string[]): Promise<Map<string, number>> {
      const out = new Map<string, number>();
      const queue = [...terms];

      async function worker() {
        for (;;) {
          const term = queue.shift();
          if (term === undefined) return;
          const url = `${API}/en.wikipedia/all-access/${agent}/${encodeArticle(term)}/monthly/${start}/${end}`;
          const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

          if (res.status === 404) {
            // Article has no data in this window. Omit it — ingest.ts flags
            // missing terms rather than us inventing a zero.
            console.warn(`  no pageview data: ${term}`);
            continue;
          }
          if (!res.ok) {
            throw new Error(`Wikimedia ${res.status} for "${term}": ${await res.text()}`);
          }

          const body = (await res.json()) as { items: { views: number }[] };
          if (!body.items?.length) {
            console.warn(`  empty response: ${term}`);
            continue;
          }
          // Median monthly views — spike-resistant. See median() above.
          out.set(term, Math.round(median(body.items.map((i) => i.views))));
        }
      }

      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, terms.length) }, worker));
      return out;
    },
  };
}
