/**
 * Export the latest publishable snapshot of each category to
 * src/data/categories/<id>.json — the files the app actually bundles.
 * Run: npm run pipeline:export
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pipelineDb } from './db';

const OUT_DIR = fileURLToPath(new URL('../src/data/categories/', import.meta.url));

async function main() {
  const db = pipelineDb();
  const { data: categories, error } = await db.from('categories').select('*');
  if (error) throw error;
  if (!categories?.length) throw new Error('No categories in DB. Run pipeline:ingest first.');

  mkdirSync(OUT_DIR, { recursive: true });

  for (const cat of categories) {
    const { data: snap } = await db
      .from('snapshots')
      .select('id, source, captured_at')
      .eq('category_id', cat.id)
      .in('status', ['validated', 'published'])
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!snap) {
      console.warn(`skip ${cat.id}: no validated/published snapshot`);
      continue;
    }

    const { data: rows } = await db
      .from('item_values')
      .select('value, items!inner(id, label, image_url)')
      .eq('snapshot_id', snap.id)
      .eq('flagged', false);

    const items = (rows ?? []).map((r: any) => ({
      id: r.items.id,
      categoryId: cat.id,
      label: r.items.label,
      value: Number(r.value),
      ...(r.items.image_url ? { imageUrl: r.items.image_url } : {}),
      source: snap.source,
      updatedAt: snap.captured_at,
    }));

    const out = {
      id: cat.id,
      name: cat.name,
      metricLabel: cat.metric_label,
      unit: cat.unit,
      snapshotId: snap.id,
      items,
    };
    writeFileSync(`${OUT_DIR}${cat.id}.json`, JSON.stringify(out, null, 2) + '\n');
    await db.from('snapshots').update({ status: 'published' }).eq('id', snap.id);
    console.log(`exported ${cat.id}: ${items.length} items (snapshot ${snap.id})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
