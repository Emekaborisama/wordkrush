/**
 * Core domain types. This layer must stay free of React / React Native /
 * Supabase imports — pure TypeScript only. See docs/BRAINSTORM.md §7.
 */

export type Item = {
  /** Stable id, e.g. "google-search.pizza" */
  id: string;
  categoryId: string;
  label: string;
  /** THE comparable metric. Must mean the same thing for every item in a category. */
  value: number;
  imageUrl?: string;
  /** Image credit — CC BY / CC BY-SA require this to be displayed. */
  imageAttribution?: string;
  imageLicense?: string;
  /** Attribution / provenance, e.g. "wikipedia-pageviews:<window>" or "wikidata:<date>" */
  source?: string;
  /** ISO date the value was captured — data goes stale. */
  updatedAt?: string;
};

/**
 * How a category's numbers are written on a card. Absent means a plain
 * grouped integer, which is how pageview counts have always read.
 */
export type ValueDisplay = {
  /** Written before the number, e.g. "$". */
  prefix?: string;
  /** Written after the number, with its own leading space, e.g. " km²". */
  suffix?: string;
  /** 100,000 and up as 3 significant figures with K / M / B / T: 1.4B, 242K. */
  compact?: boolean;
  /** Fraction digits kept below the compact threshold. Default 0. */
  decimals?: number;
};

export type Category = {
  id: string;
  name: string;
  /** What the number is, shown under it on the card: "monthly Wikipedia pageviews", "population", "height". */
  metricLabel: string;
  /** What kind of quantity every item shares. `display` says how to write it. */
  unit: 'count' | 'currency' | 'percent' | 'length' | 'area';
  display?: ValueDisplay;
  items: Item[];
};
