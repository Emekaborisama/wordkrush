/**
 * The item pool, read from the same bundled snapshot the Expo app plays on.
 *
 * This is a deliberate import across the project boundary: `reddit/` is its own
 * npm project, but the data and the engine have exactly one definition and it
 * lives in the Expo tree. `devvit.json`'s `additionalSourceRoots` is what makes
 * those parent files travel with the app when it is packaged for review.
 *
 * The snapshot is content, not incidental constants (agents.md), so it is
 * validated here rather than cast. A malformed snapshot should stop the server
 * at boot with a readable message, not produce an unfair question at round 30.
 */
import categoryJson from '../../../src/data/categories/wikipedia-popularity.json';
import { latestRoundItems, type CategorySnapshot } from '../../../src/games/more-or-less/rounds';
import type { Category, Item } from '../../../src/games/more-or-less/types';

const UNITS = new Set(['count', 'currency', 'percent']);

function fail(reason: string): never {
  throw new Error(
    `Category snapshot src/data/categories/wikipedia-popularity.json is unusable: ${reason}`,
  );
}

function readItem(raw: unknown, categoryId: string, index: number): Item {
  if (typeof raw !== 'object' || raw === null) fail(`item ${index} is not an object`);
  const item = raw as Record<string, unknown>;

  const id = item.id;
  const label = item.label;
  const value = item.value;

  if (typeof id !== 'string' || id.length === 0) fail(`item ${index} has no id`);
  if (typeof label !== 'string' || label.length === 0) fail(`item ${id} has no label`);
  // The engine's fairness guard divides by these, so a zero or a NaN is not a
  // cosmetic problem — it throws mid-run.
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    fail(`item ${id} has a non-positive or non-finite value`);
  }
  if (item.categoryId !== categoryId) {
    fail(`item ${id} claims category ${String(item.categoryId)}, not ${categoryId}`);
  }

  return { id, categoryId, label, value };
}

function readCategory(raw: unknown): Category {
  if (typeof raw !== 'object' || raw === null) fail('the file is not an object');
  const c = raw as Record<string, unknown>;

  const id = c.id;
  const name = c.name;
  const metricLabel = c.metricLabel;
  const unit = c.unit;

  if (typeof id !== 'string' || id.length === 0) fail('no category id');
  if (typeof name !== 'string' || name.length === 0) fail('no category name');
  if (typeof metricLabel !== 'string' || metricLabel.length === 0) fail('no metricLabel');
  if (typeof unit !== 'string' || !UNITS.has(unit)) fail(`unknown unit ${String(unit)}`);
  if (!Array.isArray(c.items)) fail('items is not an array');

  const items = c.items.map((item, index) => readItem(item, id, index));

  // `newRun` needs two, but a pool that small could not honour the fairness
  // guard for long. Twenty is the same floor the weekly rotate job fails at.
  if (items.length < 20) fail(`only ${items.length} items; at least 20 are needed`);

  const ids = new Set(items.map((item) => item.id));
  if (ids.size !== items.length) fail('duplicate item ids');

  return {
    id,
    name,
    metricLabel,
    unit: unit as Category['unit'],
    items,
  };
}

export const CATEGORY: Category = readCategory(categoryJson);

/** This week's names — the newest published round, shared by everyone on the post. */
export const POOL: Item[] = latestRoundItems(categoryJson as CategorySnapshot);

/** What the numbers mean. Shown next to every value; never call it "searches". */
export const METRIC_LABEL: string = CATEGORY.metricLabel;
