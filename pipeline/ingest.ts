/**
 * Batch ingest: keyword list → data source → sanity checks → Supabase.
 * Run: npm run pipeline:ingest            (uses the mock source)
 *      SOURCE=<name> npm run pipeline:ingest   once real adapters exist
 *
 * Runs long before any player sees the game. The app never calls a data
 * source at runtime — it ships a snapshot exported by export-snapshot.ts.
 */
import { readFileSync } from 'node:fs';
import { pipelineDb } from './db';
import { mockSource } from './sources/mock';
import { createWikipediaSource } from './sources/wikipedia';
import type { VolumeSource } from './sources/types';

const SOURCES: Record<string, VolumeSource> = {
  wikipedia: createWikipediaSource(),
  mock: mockSource,
};

const DEFAULT_CATEGORY = 'wikipedia-popularity';

// If a value moved more than 10x since the last snapshot, a human looks at it
// before it can ship. Real popularity rarely moves that fast; API glitches do.
const MAX_SWING_VS_PREVIOUS = 10;

async function main() {
  const sourceName = process.env.SOURCE ?? 'wikipedia';
  const source = SOURCES[sourceName];
  if (!source) throw new Error(`Unknown source "${sourceName}". Known: ${Object.keys(SOURCES).join(', ')}`);

  const categoryId = process.env.CATEGORY ?? DEFAULT_CATEGORY;
  const file = JSON.parse(
    readFileSync(new URL(`./keywords/${categoryId}.json`, import.meta.url), 'utf8'),
  );
  const db = pipelineDb();

  // Upsert category + items
  const { error: catErr } = await db.from('categories').upsert({
    id: file.category.id,
    name: file.category.name,
    metric_label: file.category.metricLabel,
    unit: file.category.unit,
  });
  if (catErr) throw catErr;

  const items = file.items.map((it: { label: string; term: string }) => ({
    id: `${file.category.id}.${it.term.replace(/\s+/g, '-')}`,
    category_id: file.category.id,
    label: it.label,
    query_term: it.term,
  }));
  const { error: itemErr } = await db.from('items').upsert(items);
  if (itemErr) throw itemErr;

  // Fetch volumes in batches
  const BATCH = 20;
  const volumes = new Map<string, number>();
  for (let i = 0; i < items.length; i += BATCH) {
    const terms = items.slice(i, i + BATCH).map((it: { query_term: string }) => it.query_term);
    const batch = await source.fetchVolumes(terms);
    for (const [term, v] of batch) volumes.set(term, v);
  }

  // Previous published snapshot, for swing detection
  const { data: prevSnap } = await db
    .from('snapshots')
    .select('id')
    .eq('category_id', file.category.id)
    .eq('status', 'published')
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const prevValues = new Map<string, number>();
  if (prevSnap) {
    const { data } = await db.from('item_values').select('item_id, value').eq('snapshot_id', prevSnap.id);
    for (const row of data ?? []) prevValues.set(row.item_id, Number(row.value));
  }

  // Create snapshot + validated values
  const { data: snap, error: snapErr } = await db
    .from('snapshots')
    .insert({ category_id: file.category.id, source: source.name, status: 'pending' })
    .select()
    .single();
  if (snapErr) throw snapErr;

  let flagged = 0;
  const rows = items.map((it: { id: string; query_term: string }) => {
    const value = volumes.get(it.query_term);
    let flag: string | null = null;
    if (value === undefined || !Number.isFinite(value) || value <= 0) {
      flag = 'missing-or-invalid-value';
    } else {
      const prev = prevValues.get(it.id);
      if (prev && Math.max(value / prev, prev / value) > MAX_SWING_VS_PREVIOUS) {
        flag = `swing>${MAX_SWING_VS_PREVIOUS}x-vs-previous (${prev} -> ${value})`;
      }
    }
    if (flag) flagged++;
    return {
      snapshot_id: snap.id,
      item_id: it.id,
      value: value && value > 0 ? value : 1, // schema requires >0; flagged rows never export
      flagged: flag !== null,
      flag_reason: flag,
    };
  });
  const { error: valErr } = await db.from('item_values').insert(rows);
  if (valErr) throw valErr;

  const status = flagged === 0 ? 'validated' : 'pending';
  await db.from('snapshots').update({ status }).eq('id', snap.id);

  console.log(
    `Snapshot ${snap.id} [${source.name}] ${file.category.id}: ${rows.length} values, ${flagged} flagged → ${status}`,
  );
  if (flagged > 0) console.log('Review flagged rows, then set snapshot status to validated/published.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
