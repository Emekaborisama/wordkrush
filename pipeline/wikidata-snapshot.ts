/**
 * Build a bundled More or Less category from Wikidata.
 *
 * The input is a curated entity file, `pipeline/entities/<categoryId>.json`:
 * which items to ask about (by Wikidata id, so a label edit never changes an
 * item's identity), the name each one is shown with, and which metric. The
 * numbers come from Wikidata through the selection rule in
 * `wikidata-metrics.ts`; the photos come from each item's English Wikipedia
 * article through the same licence-checked path the pageview categories use.
 *
 * Curated rather than queried because recognisability IS the game: "Tuvalu or
 * Nauru?" is a correct question nobody enjoys. `npm run pipeline:wikidata:discover`
 * proposes candidates ranked by how many Wikipedias cover them; a person
 * picks, and the diff is the review.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ValueDisplay } from '../src/games/more-or-less/types';
import { MIN_PLAYABLE_ITEMS } from './sanity';
import { fetchFacts, type EntityFacts } from './sources/wikidata';
import { fetchImages, type ImageInfo } from './sources/wikipedia-images';
import { isMetricId, METRICS, selectValue, type MetricId } from './wikidata-metrics';
import {
  carryForwardImages,
  compareSnapshots,
  loadBundledCategory,
  type BundledCategory,
  type BundledItem,
  type SnapshotDiff,
} from './wikipedia-snapshot';

const ENTITY_DIR = fileURLToPath(new URL('./entities/', import.meta.url));

export type EntityItem = {
  /** Shown on the card. Safe to edit: identity is the qid. */
  label: string;
  qid: string;
  /** English Wikipedia article to take the photo from instead of the item's own. */
  imageTerm?: string;
};

export type EntityFile = {
  category: { id: string; name: string; metricLabel: string; display?: ValueDisplay };
  metric: MetricId;
  items: EntityItem[];
};

export type Exclusion = {
  label: string;
  qid: string;
  reason: 'missing' | 'disputed';
  values: number[];
};

function fail(file: string, message: string): never {
  throw new Error(`${file}: ${message}`);
}

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

function parseDisplay(file: string, raw: unknown): ValueDisplay | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) fail(file, 'display must be an object');
  const d = raw as Record<string, unknown>;
  const known = new Set(['prefix', 'suffix', 'compact', 'decimals']);
  const unknown = Object.keys(d).filter((key) => !known.has(key));
  if (unknown.length > 0) fail(file, `display has unknown keys: ${unknown.join(', ')}`);
  if (d.prefix !== undefined && typeof d.prefix !== 'string') fail(file, 'display.prefix must be text');
  if (d.suffix !== undefined && typeof d.suffix !== 'string') fail(file, 'display.suffix must be text');
  if (d.compact !== undefined && typeof d.compact !== 'boolean') fail(file, 'display.compact must be true or false');
  if (d.decimals !== undefined && !(Number.isInteger(d.decimals) && (d.decimals as number) >= 0 && (d.decimals as number) <= 4)) {
    fail(file, 'display.decimals must be 0–4');
  }
  return d as ValueDisplay;
}

/** Validates an entity file. A content file is input like any other: checked, not trusted. */
export function parseEntityFile(raw: unknown, file = 'entity file'): EntityFile {
  if (typeof raw !== 'object' || raw === null) fail(file, 'not an object');
  const f = raw as Record<string, unknown>;
  const category = f.category as Record<string, unknown> | undefined;
  if (typeof category !== 'object' || category === null) fail(file, 'no category');
  if (typeof category.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(category.id)) fail(file, 'category.id must be kebab-case');
  if (!isText(category.name)) fail(file, 'category.name is empty');
  if (!isText(category.metricLabel)) fail(file, 'category.metricLabel is empty');
  if (category.metricLabel.toLowerCase().includes('google')) fail(file, 'the metric is not Google searches (D-012)');
  if (!isMetricId(f.metric)) fail(file, `unknown metric ${JSON.stringify(f.metric)}`);
  if (!Array.isArray(f.items)) fail(file, 'items is not a list');

  const items = f.items.map((row, index): EntityItem => {
    const r = row as Record<string, unknown>;
    if (!isText(r.label)) fail(file, `item ${index} has no label`);
    if (typeof r.qid !== 'string' || !/^Q[1-9]\d*$/.test(r.qid)) fail(file, `item ${index} (${String(r.label)}) has no valid qid`);
    if (r.imageTerm !== undefined && !isText(r.imageTerm)) fail(file, `item ${r.qid} has an empty imageTerm`);
    return { label: r.label.trim(), qid: r.qid, ...(r.imageTerm ? { imageTerm: r.imageTerm as string } : {}) };
  });

  const duplicate = <T>(list: T[]) => list.find((value, i) => list.indexOf(value) !== i);
  const qid = duplicate(items.map((item) => item.qid));
  if (qid) fail(file, `${qid} is listed twice`);
  const label = duplicate(items.map((item) => item.label.toLowerCase()));
  if (label) fail(file, `the label "${label}" is used twice`);

  return {
    category: {
      id: category.id,
      name: category.name.trim(),
      metricLabel: category.metricLabel.trim(),
      ...(category.display !== undefined ? { display: parseDisplay(file, category.display) } : {}),
    },
    metric: f.metric,
    items,
  };
}

export function entityFilePath(categoryId: string): string {
  return `${ENTITY_DIR}${categoryId}.json`;
}

export function loadEntityFile(categoryId: string): EntityFile {
  const path = entityFilePath(categoryId);
  const file = parseEntityFile(JSON.parse(readFileSync(path, 'utf8')), path);
  if (file.category.id !== categoryId) fail(path, `category.id is ${file.category.id}, not ${categoryId}`);
  return file;
}

export function listEntityCategories(): string[] {
  return readdirSync(ENTITY_DIR)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.slice(0, -'.json'.length))
    .sort();
}

/** Stable while the item stays in the file, whatever its label becomes. */
export function wikidataItemId(categoryId: string, qid: string): string {
  return `${categoryId}.${qid.toLowerCase()}`;
}

/** The article a card photo is taken from. */
export function imageArticle(item: EntityItem, facts: EntityFacts | undefined): string | undefined {
  return item.imageTerm ?? facts?.enwikiTitle;
}

/**
 * Entity rows + fetched facts + photos → bundled items, and the rows left
 * out with the reason. Pure, so the whole decision is testable offline.
 */
export function buildItems(
  file: EntityFile,
  facts: ReadonlyMap<string, EntityFacts>,
  images: ReadonlyMap<string, ImageInfo>,
  source: string,
  updatedAt: string,
): { items: BundledItem[]; excluded: Exclusion[] } {
  const spec = METRICS[file.metric];
  const items: BundledItem[] = [];
  const excluded: Exclusion[] = [];
  for (const row of file.items) {
    const entity = facts.get(row.qid);
    const selection = selectValue(entity?.statements ?? [], spec);
    if (!selection.ok) {
      excluded.push({ label: row.label, qid: row.qid, reason: selection.reason, values: selection.values });
      continue;
    }
    const article = imageArticle(row, entity);
    const image = article ? images.get(article) : undefined;
    items.push({
      id: wikidataItemId(file.category.id, row.qid),
      categoryId: file.category.id,
      label: row.label,
      value: selection.value,
      ...(image ? { imageUrl: image.url, imageAttribution: image.attribution, imageLicense: image.license } : {}),
      source,
      updatedAt,
    });
  }
  items.sort((a, b) => b.value - a.value);
  return { items, excluded };
}

export type WikidataBuild = {
  snapshot: BundledCategory;
  excluded: Exclusion[];
  diff: SnapshotDiff;
  failedImages: string[];
};

export async function buildWikidataSnapshot(categoryId: string, now = new Date()): Promise<WikidataBuild> {
  const file = loadEntityFile(categoryId);
  const spec = METRICS[file.metric];
  const facts = await fetchFacts(
    file.items.map((item) => item.qid),
    spec.property,
    spec.normalized,
  );

  const articles = [
    ...new Set(file.items.map((item) => imageArticle(item, facts.get(item.qid))).filter((a): a is string => Boolean(a))),
  ];
  const { images, failed } = await fetchImages(articles, 800);

  const updatedAt = now.toISOString().slice(0, 10);
  const source = `wikidata:${updatedAt.replace(/-/g, '')}`;
  const built = buildItems(file, facts, images, source, updatedAt);

  // A thrown image fetch (429, network) keeps the photo already shipped.
  const previous = loadBundledCategory(categoryId);
  const failedArticles = new Set(failed);
  const failedIds = new Set(
    file.items
      .filter((item) => {
        const article = imageArticle(item, facts.get(item.qid));
        return article !== undefined && failedArticles.has(article);
      })
      .map((item) => wikidataItemId(categoryId, item.qid)),
  );
  const items = carryForwardImages(previous?.items ?? [], built.items, failedIds);

  const snapshot: BundledCategory = {
    id: file.category.id,
    name: file.category.name,
    metricLabel: file.category.metricLabel,
    unit: spec.unit,
    ...(file.category.display ? { display: file.category.display } : {}),
    provisional: true,
    items,
  };
  return { snapshot, excluded: built.excluded, diff: compareSnapshots(previous?.items ?? [], items), failedImages: failed };
}

/** Whether a build may be written: a category the game cannot play is not shipped. */
export function isPlayable(snapshot: BundledCategory): boolean {
  return snapshot.items.length >= MIN_PLAYABLE_ITEMS;
}

export function formatBuildReport(build: WikidataBuild): string {
  const { snapshot, excluded, diff } = build;
  const items = snapshot.items;
  const withImage = items.filter((item) => item.imageUrl).length;
  const values = items.map((item) => item.value);
  const spread = values.length > 1 ? Math.max(...values) / Math.min(...values) : 0;
  const lines = [
    `${snapshot.id}: ${items.length} items, ${withImage}/${items.length} with a free photo, spread ${spread.toFixed(1)}×`,
  ];
  if (!isPlayable(snapshot)) lines.push(`  NOT WRITTEN: needs at least ${MIN_PLAYABLE_ITEMS} items`);
  if (withImage < items.length * 0.9) lines.push('  photo coverage under 90%: add imageTerm to the uncovered rows');
  for (const row of excluded) {
    const seen = row.values.length > 0 ? ` (${row.values.join(' / ')})` : '';
    lines.push(`  left out ${row.label} ${row.qid}: ${row.reason}${seen}`);
  }
  for (const item of items.filter((i) => !i.imageUrl)) lines.push(`  no photo: ${item.label}`);
  for (const swing of diff.swings) {
    lines.push(`  moved more than 10×: ${swing.label} ${swing.from} → ${swing.to}`);
  }
  if (diff.added.length > 0) lines.push(`  added ${diff.added.length}, removed ${diff.removed.length}, changed ${diff.valueChanges.length}`);
  if (build.failedImages.length > 0) lines.push(`  photo fetch failed for ${build.failedImages.length} article(s); kept shipped photos`);
  return lines.join('\n');
}
