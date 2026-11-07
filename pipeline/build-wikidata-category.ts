/**
 * Build bundled More or Less categories from Wikidata.
 *
 *     npm run pipeline:wikidata                         # every pipeline/entities/*.json
 *     CATEGORY=countries-population npm run pipeline:wikidata
 *
 * Writes `src/data/categories/<id>.json`. Like `pipeline:preview`, this skips
 * the Supabase factory path, so the file is marked `provisional: true`; the
 * diff is the review, and `npm run check` runs the dataset tests over it.
 * A category with fewer than 20 playable items is not written at all.
 */
import { buildWikidataSnapshot, formatBuildReport, isPlayable, listEntityCategories } from './wikidata-snapshot';
import { writeBundledCategory } from './wikipedia-snapshot';

async function main(): Promise<void> {
  const only = process.env.CATEGORY;
  const ids = only ? [only] : listEntityCategories();
  let refused = 0;
  for (const id of ids) {
    const build = await buildWikidataSnapshot(id);
    console.log(formatBuildReport(build));
    if (!isPlayable(build.snapshot)) {
      refused += 1;
      continue;
    }
    console.log(`  wrote ${writeBundledCategory(build.snapshot)}`);
  }
  if (refused > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
