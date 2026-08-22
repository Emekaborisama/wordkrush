/**
 * Weekly refresh of the bundled Wikipedia popularity category.
 * Run: npm run pipeline:rotate
 *
 * Fetches the same way as pipeline:preview (pageviews + free-licence images),
 * compares against the JSON already in the repo, and writes only when values,
 * images, membership, or the pageview window actually changed. Does not talk
 * to Supabase and does not push git — the GitHub Action opens a review PR.
 */
import { writeFileSync } from 'node:fs';
import { MIN_PLAYABLE_ITEMS } from './sanity';
import {
  buildWikipediaPopularitySnapshot,
  compareSnapshots,
  DEFAULT_CATEGORY_ID,
  formatRotateReport,
  loadBundledCategory,
  writeBundledCategory,
  writeChangelogBullet,
  writeGithubOutput,
  writeGithubSummary,
} from './wikipedia-snapshot';

async function main() {
  const categoryId = process.env.CATEGORY ?? DEFAULT_CATEGORY_ID;
  console.log(`rotating ${categoryId} ...`);

  const { snapshot, keywordCount } = await buildWikipediaPopularitySnapshot(categoryId);
  const omitted = keywordCount - snapshot.items.length;
  if (snapshot.items.length < MIN_PLAYABLE_ITEMS) {
    throw new Error(
      `Refusing to write ${categoryId}: ${snapshot.items.length} items (need ≥${MIN_PLAYABLE_ITEMS}). ${omitted} had no pageview data.`,
    );
  }

  const previous = loadBundledCategory(categoryId);
  const diff = compareSnapshots(previous?.items ?? [], snapshot.items);
  const report = formatRotateReport(diff, snapshot.items.length, omitted);
  console.log(report);
  writeGithubSummary(report);
  if (process.env.GITHUB_WORKSPACE) {
    writeFileSync(`${process.env.GITHUB_WORKSPACE}/pr-body.md`, report);
  }

  if (!diff.materialChange) {
    writeGithubOutput('changed', 'false');
    console.log('unchanged — leaving the bundled snapshot alone.');
    return;
  }

  const dest = writeBundledCategory(snapshot);
  writeChangelogBullet(
    'Changed',
    `Wikipedia popularity snapshot refreshed (\`${diff.nextSource}\`)`,
  );
  writeGithubOutput('changed', 'true');
  writeGithubOutput('window', diff.nextSource ?? '');
  console.log(`wrote ${snapshot.items.length} items -> ${dest}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
