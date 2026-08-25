/**
 * Weekly refresh of the bundled Wikipedia popularity category.
 * Run: npm run pipeline:rotate
 *
 * Re-measures every item already in the snapshot, then samples a new unused
 * label round from the reservoir (about 25 playable articles) and appends it.
 * The player's current set does not change until they exhaust it — this job
 * only enqueues the next one. Does not talk to Supabase and does not push git.
 */
import { writeFileSync } from 'node:fs';
import { MIN_PLAYABLE_ITEMS } from './sanity';
import {
  ROUND_CANDIDATE_POOL,
  ROUND_SIZE,
  isoWeekRoundId,
  loadReservoir,
  sampleRound,
  seedFromRoundId,
  unusedTerms,
} from './reservoir';
import {
  compareSnapshots,
  DEFAULT_CATEGORY_ID,
  defaultRounds,
  formatRotateReport,
  itemId,
  keywordByItemId,
  loadBundledCategory,
  loadKeywordFile,
  measureKeywords,
  writeBundledCategory,
  writeChangelogBullet,
  writeGithubOutput,
  writeGithubSummary,
  type BundledCategory,
  type LabelRoundDef,
} from './wikipedia-snapshot';

function loadLookup(categoryId: string) {
  const keywords = loadKeywordFile(categoryId).items;
  let reservoir = keywords;
  try {
    reservoir = [...keywords, ...loadReservoir().items];
  } catch {
    reservoir = keywords;
  }
  return { keywords, lookup: keywordByItemId(categoryId, reservoir), reservoir };
}

async function enqueueRound(
  categoryId: string,
  snapshot: BundledCategory,
): Promise<{ snapshot: BundledCategory; appendedRoundId: string | undefined; omitted: number }> {
  const { reservoir } = loadLookup(categoryId);
  const usedIds = new Set(snapshot.items.map((item) => item.id));
  const unused = unusedTerms(reservoir, usedIds, (term) => itemId(categoryId, term));
  const seedRounds = Math.max(1, Number(process.env.SEED_ROUNDS ?? '1') || 1);
  let current = snapshot;
  let lastId: string | undefined;
  let omitted = 0;

  for (let i = 0; i < seedRounds; i++) {
    const roundId = i === 0 ? isoWeekRoundId(new Date()) : `${isoWeekRoundId(new Date())}-${i + 1}`;
    if ((current.rounds ?? []).some((round) => round.id === roundId)) continue;
    const remaining = unusedTerms(
      unused,
      new Set(current.items.map((item) => item.id)),
      (term) => itemId(categoryId, term),
    );
    const sampled = sampleRound(remaining, seedFromRoundId(roundId), ROUND_CANDIDATE_POOL);
    if (sampled.length < MIN_PLAYABLE_ITEMS) {
      console.log(`not enough unused reservoir terms for ${roundId} (${remaining.length} left).`);
      break;
    }
    const measured = await measureKeywords(categoryId, sampled, []);
    omitted += measured.omitted;
    const playable = measured.items.slice(0, ROUND_SIZE);
    if (playable.length < MIN_PLAYABLE_ITEMS) {
      console.log(`sampled round ${roundId} only produced ${playable.length} playable items.`);
      break;
    }
    const round: LabelRoundDef = { id: roundId, itemIds: playable.map((item) => item.id) };
    const byId = new Map(current.items.map((item) => [item.id, item]));
    for (const item of playable) byId.set(item.id, item);
    current = {
      ...current,
      rounds: [...(current.rounds ?? defaultRounds(current.items)), round],
      items: [...byId.values()].sort((a, b) => b.value - a.value),
    };
    lastId = roundId;
    console.log(`appended ${roundId} (${playable.length} items).`);
  }

  return { snapshot: current, appendedRoundId: lastId, omitted };
}

async function main() {
  const categoryId = process.env.CATEGORY ?? DEFAULT_CATEGORY_ID;
  console.log(`rotating ${categoryId} ...`);

  const previous = loadBundledCategory(categoryId);
  if (!previous) {
    throw new Error(`No bundled snapshot for ${categoryId}; run pipeline:preview first.`);
  }

  const { lookup, keywords } = loadLookup(categoryId);
  const existingKeywords = previous.items
    .map((item) => lookup.get(item.id) ?? keywords.find((row) => itemId(categoryId, row.term) === item.id))
    .filter((item): item is { label: string; term: string } => item !== undefined);

  if (existingKeywords.length < MIN_PLAYABLE_ITEMS) {
    throw new Error(
      `Refusing to rotate ${categoryId}: only ${existingKeywords.length} existing items resolved to terms.`,
    );
  }

  const remeasured = await measureKeywords(categoryId, existingKeywords, previous.items);
  let next: BundledCategory = {
    ...previous,
    rounds: previous.rounds && previous.rounds.length > 0 ? previous.rounds : defaultRounds(remeasured.items),
    items: remeasured.items,
  };

  let appendedRoundId: string | undefined;
  let sampleOmitted = 0;
  try {
    loadReservoir();
    const enqueued = await enqueueRound(categoryId, next);
    next = enqueued.snapshot;
    appendedRoundId = enqueued.appendedRoundId;
    sampleOmitted = enqueued.omitted;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`no reservoir enqueue (${message}). Re-measure only.`);
  }

  if (next.items.length < MIN_PLAYABLE_ITEMS) {
    throw new Error(
      `Refusing to write ${categoryId}: ${next.items.length} items (need ≥${MIN_PLAYABLE_ITEMS}).`,
    );
  }

  const omitted = remeasured.omitted + sampleOmitted;
  const diff = compareSnapshots(previous.items, next.items);
  const material = diff.materialChange || Boolean(appendedRoundId);
  const report = formatRotateReport(
    { ...diff, materialChange: material },
    next.items.length,
    omitted,
    appendedRoundId,
  );
  console.log(report);
  writeGithubSummary(report);
  if (process.env.GITHUB_WORKSPACE) {
    writeFileSync(`${process.env.GITHUB_WORKSPACE}/pr-body.md`, report);
  }

  if (!material) {
    writeGithubOutput('changed', 'false');
    console.log('unchanged — leaving the bundled snapshot alone.');
    return;
  }

  const dest = writeBundledCategory(next);
  writeChangelogBullet(
    'Changed',
    appendedRoundId
      ? `Wikipedia popularity snapshot refreshed (\`${diff.nextSource}\`) and label round \`${appendedRoundId}\` queued`
      : `Wikipedia popularity snapshot refreshed (\`${diff.nextSource}\`)`,
  );
  writeGithubOutput('changed', 'true');
  writeGithubOutput('window', diff.nextSource ?? '');
  console.log(`wrote ${next.items.length} items -> ${dest}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
