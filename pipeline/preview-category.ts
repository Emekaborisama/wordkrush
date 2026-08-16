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
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createWikipediaSource } from './sources/wikipedia';
import { fetchImages } from './sources/wikipedia-images';

const OUT_DIR = fileURLToPath(new URL('../src/data/categories/', import.meta.url));

type KeywordFile = {
  category: { id: string; name: string; metricLabel: string; unit: string };
  items: { label: string; term: string }[];
};

async function main() {
  const categoryId = process.env.CATEGORY ?? 'wikipedia-popularity';
  const file: KeywordFile = JSON.parse(
    readFileSync(new URL(`./keywords/${categoryId}.json`, import.meta.url), 'utf8'),
  );

  const source = createWikipediaSource();
  console.log(`fetching ${file.items.length} articles from ${source.name} ...`);

  const volumes = await source.fetchVolumes(file.items.map((i) => i.term));

  console.log('fetching images (free licences only) ...');
  // 800px: cards are full-bleed, so 400 looks soft on a retina screen.
  const images = await fetchImages(file.items.map((i) => i.term), 800);

  const items = file.items
    .map((it) => {
      const value = volumes.get(it.term);
      if (value === undefined) return null;
      const image = images.get(it.term);
      return {
        id: `${file.category.id}.${it.term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        categoryId: file.category.id,
        label: it.label,
        value,
        ...(image
          ? {
              imageUrl: image.url,
              imageAttribution: image.attribution,
              imageLicense: image.license,
            }
          : {}),
        source: source.name,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.value - a.value);

  const out = {
    ...file.category,
    provisional: true,
    items,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}${file.category.id}.json`, JSON.stringify(out, null, 2) + '\n');

  const missing = file.items.length - items.length;
  const withImages = items.filter((i) => 'imageUrl' in i).length;
  console.log(`wrote ${items.length} items -> src/data/categories/${file.category.id}.json`);
  console.log(`  ${withImages}/${items.length} have a freely-licensed image`);
  if (missing > 0) console.log(`  ${missing} item(s) had no data and were omitted`);
  console.log(`  range: ${items.at(-1)!.value.toLocaleString()} .. ${items[0].value.toLocaleString()}`);
  console.log('  NOTE: provisional (no Supabase provenance). Not for release.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
