/**
 * DEV PATH — fetch a category straight to bundled JSON, skipping Supabase.
 *
 *     npm run pipeline:preview
 *
 * Why this exists: the production path is ingest -> Supabase (snapshots,
 * flags, audit trail) -> export. That path is blocked until the migration is
 * applied. This script unblocks UI work today by writing a playable category
 * file directly.
 *
 * What it deliberately SKIPS, and why that matters:
 *   - no snapshot row, so no provenance or audit trail
 *   - no swing detection against a previous snapshot
 *   - no LLM cross-check, so no flagged-pair review
 *
 * Output is therefore marked `"provisional": true`. Running the real pipeline
 * (pipeline:ingest + pipeline:export) overwrites it with a validated snapshot.
 * Do not ship a provisional file to the App Store.
 *
 * Weekly refresh uses the same builder (`npm run pipeline:rotate`) and still
 * writes a provisional file until the factory path is live.
 */
import {
  buildWikipediaPopularitySnapshot,
  DEFAULT_CATEGORY_ID,
  writeBundledCategory,
} from './wikipedia-snapshot';

async function main() {
  const categoryId = process.env.CATEGORY ?? DEFAULT_CATEGORY_ID;
  console.log(`fetching ${categoryId} from Wikimedia ...`);

  const { snapshot, keywordCount } = await buildWikipediaPopularitySnapshot(categoryId);
  const dest = writeBundledCategory(snapshot);

  const missing = keywordCount - snapshot.items.length;
  const withImages = snapshot.items.filter((item) => item.imageUrl).length;
  console.log(`wrote ${snapshot.items.length} items -> ${dest}`);
  console.log(`  ${withImages}/${snapshot.items.length} have a freely-licensed image`);
  if (missing > 0) console.log(`  ${missing} item(s) had no data and were omitted`);
  const last = snapshot.items.at(-1);
  const first = snapshot.items[0];
  if (last && first) {
    console.log(`  range: ${last.value.toLocaleString()} .. ${first.value.toLocaleString()}`);
  }
  console.log('  NOTE: provisional (no Supabase provenance). Not for release.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
