/**
 * DEV TOOL — propose items for a new Wikidata label, with the value each one
 * would ship with, so curating a list takes minutes instead of an afternoon.
 *
 *     npm run pipeline:wikidata:discover -- --metric population --preset countries --limit 80
 *     npm run pipeline:wikidata:discover -- --metric height --titles "Burj Khalifa,Eiffel Tower,Big Ben"
 *     npm run pipeline:wikidata:discover -- --metric elevation --preset mountains --json > /tmp/rows.json
 *
 * Presets rank by sitelinks — how many Wikipedias have an article on the item
 * — which is a free, CC0 stand-in for "has a player heard of it". `--titles`
 * resolves English Wikipedia article titles to items, for lists a person
 * already has in mind. Either way the output is a starting point: pick the
 * recognisable rows, fix the labels, and paste them into
 * `pipeline/entities/<id>.json`. Rows the selection rule would leave out are
 * shown with the reason, so a disputed item is dropped before it is curated.
 */
import { assertQid, fetchFacts, sparql } from './sources/wikidata';
import { isMetricId, METRICS, selectValue, type MetricId } from './wikidata-metrics';

/** Candidate patterns. Each binds ?item. */
const PRESETS: Readonly<Record<string, string>> = {
  countries: '?item wdt:P31 wd:Q3624078 . FILTER NOT EXISTS { ?item wdt:P576 [] }',
  'nigerian-states': '?item wdt:P31 wd:Q465842 . FILTER NOT EXISTS { ?item wdt:P576 [] }',
  mountains: 'VALUES ?class { wd:Q8502 wd:Q8072 wd:Q169358 wd:Q54050 } ?item wdt:P31 ?class .',
  rivers: '?item wdt:P31 wd:Q4022 .',
  islands: '?item wdt:P31 wd:Q23442 .',
  lakes: '?item wdt:P31 wd:Q23397 .',
};

type Options = { metric: MetricId; preset?: string; titles: string[]; limit: number; json: boolean };

function parseArgs(argv: readonly string[]): Options {
  let metric: string | undefined;
  let preset: string | undefined;
  let titles: string[] = [];
  let limit = 100;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    switch (flag) {
      case '--metric':
        metric = value;
        i++;
        break;
      case '--preset':
        preset = value;
        i++;
        break;
      case '--titles':
        titles = (value ?? '').split(',').map((t) => t.trim()).filter(Boolean);
        i++;
        break;
      case '--limit':
        limit = Number(value);
        i++;
        break;
      case '--json':
        json = true;
        break;
      default:
        throw new Error(`unknown argument ${flag}`);
    }
  }
  if (!isMetricId(metric)) throw new Error(`--metric must be one of ${Object.keys(METRICS).join(', ')}`);
  if (preset !== undefined && !(preset in PRESETS)) throw new Error(`--preset must be one of ${Object.keys(PRESETS).join(', ')}`);
  if (!preset && titles.length === 0) throw new Error('give --preset or --titles');
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('--limit must be 1–1000');
  return { metric, preset, titles, limit, json };
}

const entity = (uri: string | undefined) => uri?.replace('http://www.wikidata.org/entity/', '');

async function fromPreset(preset: string, metric: MetricId, limit: number): Promise<Map<string, number>> {
  const { property } = METRICS[metric];
  const query = `SELECT ?item ?links WHERE {
  ${PRESETS[preset]}
  FILTER EXISTS { ?item p:${property} [] }
  ?item wikibase:sitelinks ?links .
} ORDER BY DESC(?links) LIMIT ${limit}`;
  const json = await sparql(query);
  const out = new Map<string, number>();
  for (const row of json.results.bindings) {
    const qid = entity(row.item?.value);
    if (qid && /^Q\d+$/.test(qid)) out.set(qid, Number(row.links?.value ?? 0));
  }
  return out;
}

async function fromTitles(titles: readonly string[]): Promise<{ found: Map<string, number>; missing: string[] }> {
  // JSON string escaping is valid SPARQL string escaping for these characters.
  const values = titles.map((title) => `${JSON.stringify(title)}@en`).join(' ');
  const query = `SELECT ?title ?item ?links WHERE {
  VALUES ?title { ${values} }
  ?article schema:name ?title ; schema:isPartOf <https://en.wikipedia.org/> ; schema:about ?item .
  ?item wikibase:sitelinks ?links .
}`;
  const json = await sparql(query);
  const found = new Map<string, number>();
  const seen = new Set<string>();
  for (const row of json.results.bindings) {
    const qid = entity(row.item?.value);
    if (!qid || !/^Q\d+$/.test(qid)) continue;
    found.set(qid, Number(row.links?.value ?? 0));
    if (row.title?.value) seen.add(row.title.value);
  }
  return { found, missing: titles.filter((title) => !seen.has(title)) };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const spec = METRICS[options.metric];
  let candidates: Map<string, number>;
  let missing: string[] = [];
  if (options.preset) {
    candidates = await fromPreset(options.preset, options.metric, options.limit);
  } else {
    const resolved = await fromTitles(options.titles);
    candidates = resolved.found;
    missing = resolved.missing;
  }
  const qids = [...candidates.keys()];
  qids.forEach(assertQid);
  const facts = await fetchFacts(qids, spec.property, spec.normalized);

  const rows = qids.map((qid) => {
    const f = facts.get(qid)!;
    const selection = selectValue(f.statements, spec);
    return {
      qid,
      sitelinks: candidates.get(qid) ?? 0,
      title: f.enwikiTitle ?? '',
      label: f.enwikiTitle ?? f.enLabel ?? qid,
      value: selection.ok ? selection.value : null,
      note: selection.ok ? (selection.pointInTime ?? '') : `${selection.reason} ${selection.values.join(' / ')}`.trim(),
    };
  });

  if (options.json) {
    const usable = rows.filter((row) => row.value !== null).map((row) => ({ label: row.label, qid: row.qid }));
    console.log(JSON.stringify(usable, null, 2));
  } else {
    console.table(rows);
  }
  for (const title of missing) console.error(`no English Wikipedia article titled "${title}"`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
