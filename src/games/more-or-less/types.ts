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
  /** Attribution / provenance, e.g. "wikipedia-pageviews:<window>" */
  source?: string;
  /** ISO date the value was captured — data goes stale. */
  updatedAt?: string;
};

export type Category = {
  id: string;
  name: string;
  /** Shown to the player, e.g. "monthly Google searches" */
  metricLabel: string;
  unit: 'count' | 'currency' | 'percent';
  items: Item[];
};
