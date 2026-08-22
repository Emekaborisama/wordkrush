/**
 * Build and compare the bundled Wikipedia popularity category.
 * Used by `pipeline:preview` (always write) and `pipeline:rotate` (write only
 * when the snapshot materially changed).
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MAX_SWING_VS_PREVIOUS } from './sanity';
import { fetchImages } from './sources/wikipedia-images';
import { createWikipediaSource } from './sources/wikipedia';

export const DEFAULT_CATEGORY_ID = 'wikipedia-popularity';

const OUT_DIR = fileURLToPath(new URL('../src/data/categories/', import.meta.url));
const CHANGELOG_PATH = fileURLToPath(new URL('../docs/CHANGELOG.md', import.meta.url));

export type KeywordFile = {
  category: { id: string; name: string; metricLabel: string; unit: string };
  items: { label: string; term: string }[];
};

export type BundledItem = {
  id: string;
  categoryId: string;
  label: string;
  value: number;
  imageUrl?: string;
  imageAttribution?: string;
  imageLicense?: string;
  source: string;
  updatedAt: string;
};

export type BundledCategory = {
  id: string;
  name: string;
  metricLabel: string;
  unit: string;
  provisional: true;
  items: BundledItem[];
};

export type ValueChange = {
  id: string;
  label: string;
  from: number;
  to: number;
  ratio: number;
};

export type SnapshotDiff = {
  materialChange: boolean;
  added: string[];
  removed: string[];
  valueChanges: ValueChange[];
  swings: ValueChange[];
  sourceChanged: boolean;
  previousSource: string | null;
  nextSource: string | null;
  imageChanges: string[];
};

export function bundledCategoryPath(categoryId: string): string {
  return `${OUT_DIR}${categoryId}.json`;
}

export function loadKeywordFile(categoryId: string): KeywordFile {
  return JSON.parse(
    readFileSync(new URL(`./keywords/${categoryId}.json`, import.meta.url), 'utf8'),
  ) as KeywordFile;
}

export function loadBundledCategory(categoryId: string): BundledCategory | null {
  try {
    return JSON.parse(readFileSync(bundledCategoryPath(categoryId), 'utf8')) as BundledCategory;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return null;
    throw err;
  }
}

export function itemId(categoryId: string, term: string): string {
  return `${categoryId}.${term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export function swingRatio(previous: number, next: number): number {
  return Math.max(next / previous, previous / next);
}

function imageFingerprint(item: BundledItem): string {
  return `${item.imageUrl ?? ''}|${item.imageAttribution ?? ''}|${item.imageLicense ?? ''}`;
}

export function compareSnapshots(
  previous: BundledItem[],
  next: BundledItem[],
  maxSwing = MAX_SWING_VS_PREVIOUS,
): SnapshotDiff {
  const prevById = new Map(previous.map((item) => [item.id, item]));
  const nextById = new Map(next.map((item) => [item.id, item]));

  const added = [...nextById.keys()].filter((id) => !prevById.has(id)).sort();
  const removed = [...prevById.keys()].filter((id) => !nextById.has(id)).sort();

  const valueChanges: ValueChange[] = [];
  const swings: ValueChange[] = [];
  const imageChanges: string[] = [];

  for (const [id, nxt] of nextById) {
    const prev = prevById.get(id);
    if (!prev) continue;
    if (prev.value !== nxt.value) {
      const change: ValueChange = {
        id,
        label: nxt.label,
        from: prev.value,
        to: nxt.value,
        ratio: swingRatio(prev.value, nxt.value),
      };
      valueChanges.push(change);
      if (change.ratio > maxSwing) swings.push(change);
    }
    if (imageFingerprint(prev) !== imageFingerprint(nxt)) imageChanges.push(id);
  }

  const previousSource = previous[0]?.source ?? null;
  const nextSource = next[0]?.source ?? null;
  const sourceChanged = previousSource !== nextSource;

  return {
    materialChange:
      added.length > 0 ||
      removed.length > 0 ||
      valueChanges.length > 0 ||
      sourceChanged ||
      imageChanges.length > 0,
    added,
    removed,
    valueChanges,
    swings,
    sourceChanged,
    previousSource,
    nextSource,
    imageChanges,
  };
}

export function appendUnreleasedBullet(
  markdown: string,
  section: 'Added' | 'Changed',
  bullet: string,
): string {
  const line = bullet.startsWith('- ') ? bullet : `- ${bullet}`;
  const heading = `### ${section}`;
  const headingAt = markdown.indexOf(heading);
  if (headingAt === -1) {
    const unreleased = markdown.indexOf('## [Unreleased]');
    if (unreleased === -1) {
      throw new Error('CHANGELOG.md is missing ## [Unreleased]');
    }
    const insertAt = markdown.indexOf('\n', unreleased) + 1;
    return `${markdown.slice(0, insertAt)}\n${heading}\n${line}\n${markdown.slice(insertAt)}`;
  }
  const afterHeading = headingAt + heading.length;
  const nl = markdown[afterHeading] === '\n' ? afterHeading + 1 : afterHeading;
  return `${markdown.slice(0, nl)}${line}\n${markdown.slice(nl)}`;
}

export function writeChangelogBullet(section: 'Added' | 'Changed', bullet: string): void {
  const next = appendUnreleasedBullet(readFileSync(CHANGELOG_PATH, 'utf8'), section, bullet);
  writeFileSync(CHANGELOG_PATH, next);
}

export async function buildWikipediaPopularitySnapshot(
  categoryId = DEFAULT_CATEGORY_ID,
): Promise<{ snapshot: BundledCategory; keywordCount: number }> {
  const file = loadKeywordFile(categoryId);
  const source = createWikipediaSource();
  const volumes = await source.fetchVolumes(file.items.map((item) => item.term));
  const images = await fetchImages(
    file.items.map((item) => item.term),
    800,
  );
  const updatedAt = new Date().toISOString().slice(0, 10);

  const items = file.items
    .map((item) => {
      const value = volumes.get(item.term);
      if (value === undefined) return null;
      const image = images.get(item.term);
      return {
        id: itemId(file.category.id, item.term),
        categoryId: file.category.id,
        label: item.label,
        value,
        ...(image
          ? {
              imageUrl: image.url,
              imageAttribution: image.attribution,
              imageLicense: image.license,
            }
          : {}),
        source: source.name,
        updatedAt,
      };
    })
    .filter((item): item is BundledItem => item !== null)
    .sort((a, b) => b.value - a.value);

  return {
    keywordCount: file.items.length,
    snapshot: {
      ...file.category,
      provisional: true,
      items,
    },
  };
}

export function writeBundledCategory(snapshot: BundledCategory): string {
  mkdirSync(OUT_DIR, { recursive: true });
  const dest = bundledCategoryPath(snapshot.id);
  writeFileSync(dest, JSON.stringify(snapshot, null, 2) + '\n');
  return dest;
}

export function formatRotateReport(
  diff: SnapshotDiff,
  itemCount: number,
  omitted: number,
): string {
  const lines = [
    'Weekly Wikipedia popularity snapshot.',
    '',
    `Items: ${itemCount} (${omitted} omitted — no pageview data).`,
    `Window: ${diff.nextSource ?? 'unknown'}.`,
    '',
  ];
  if (!diff.materialChange) {
    lines.push('No material change vs the bundled snapshot. No PR.');
    return `${lines.join('\n')}\n`;
  }
  if (diff.sourceChanged) {
    lines.push(`Source window: ${diff.previousSource ?? '(none)'} → ${diff.nextSource}.`);
  }
  if (diff.added.length) lines.push(`Added: ${diff.added.join(', ')}.`);
  if (diff.removed.length) lines.push(`Removed: ${diff.removed.join(', ')}.`);
  lines.push(`Value changes: ${diff.valueChanges.length}.`);
  lines.push(`Image changes: ${diff.imageChanges.length}.`);
  if (diff.swings.length) {
    lines.push('');
    lines.push(`**${diff.swings.length} swing(s) >${MAX_SWING_VS_PREVIOUS}x — review before merge:**`);
    for (const swing of diff.swings) {
      lines.push(
        `- ${swing.label}: ${swing.from.toLocaleString()} → ${swing.to.toLocaleString()} (${swing.ratio.toFixed(1)}x)`,
      );
    }
  }
  lines.push('');
  lines.push('The JSON diff is the content review. Do not auto-merge. Play stays offline (D-004).');
  return `${lines.join('\n')}\n`;
}

export function writeGithubOutput(name: string, value: string): void {
  const dest = process.env.GITHUB_OUTPUT;
  if (!dest) return;
  appendFileSync(dest, `${name}=${value}\n`);
}

export function writeGithubSummary(markdown: string): void {
  const dest = process.env.GITHUB_STEP_SUMMARY;
  if (!dest) return;
  appendFileSync(dest, markdown);
}
