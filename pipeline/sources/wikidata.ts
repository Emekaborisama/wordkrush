/**
 * Wikidata source — structured, measured facts (population, area, height,
 * length) under CC0, so the numbers may be bundled and redistributed with no
 * attribution requirement and no API key (STACK D-075).
 *
 * WHY NOT ONE NUMBER PER ITEM. A Wikidata item can carry several statements
 * for one property: a census and three estimates, a total area and a land
 * area, a tower's height with and without its antenna, a "length" that is
 * really one country's stretch of a river. This module only FETCHES every
 * statement with the facts needed to choose between them (rank, date, the
 * part it applies to, unit). Choosing is a pure rule in `wikidata-metrics.ts`,
 * where it can be tested on the awkward real cases.
 *
 * Queries go to the public SPARQL endpoint as POST (no URL length limit for a
 * long VALUES list) through `politeFetch`, which backs off on HTTP 429.
 * Content builds are offline and rare; nothing here runs at play time.
 */
import { politeFetch } from './politeFetch';

const ENDPOINT = 'https://query.wikidata.org/sparql';
// Wikimedia asks for an identifying User-Agent and throttles generic ones.
const USER_AGENT = 'wordkrush/0.1 (https://wordkrush.com)';
/** Items per query. Comfortably inside the endpoint's 60-second budget. */
export const BATCH_SIZE = 150;

const ENTITY = 'http://www.wikidata.org/entity/';
const ONTOLOGY = 'http://wikiba.se/ontology#';

export type Rank = 'preferred' | 'normal' | 'deprecated';

export type Statement = {
  /** The statement's own id; one statement can come back on several rows. */
  id: string;
  /** In the property's normalised SI unit when fetched normalised. */
  amount: number;
  /** Unit item id; `Q199` ("1") for a plain count. */
  unit: string;
  rank: Rank;
  /** `YYYY-MM-DD` from the "point in time" qualifier (P585), when present. */
  pointInTime?: string;
  /** Item ids from the "applies to part" qualifier (P518). */
  parts: string[];
};

export type EntityFacts = {
  qid: string;
  enLabel?: string;
  /** Exact English Wikipedia article title, used for the card photo. */
  enwikiTitle?: string;
  statements: Statement[];
};

type Binding = { type: string; value: string; datatype?: string; 'xml:lang'?: string };
export type SparqlJson = { results: { bindings: Array<Record<string, Binding | undefined>> } };

const QID = /^Q[1-9]\d*$/;
const PID = /^P[1-9]\d*$/;

/** Ids go into query text, so anything that is not an id is refused, not escaped. */
export function assertQid(qid: string): void {
  if (!QID.test(qid)) throw new Error(`not a Wikidata item id: ${JSON.stringify(qid)}`);
}

function assertPid(pid: string): void {
  if (!PID.test(pid)) throw new Error(`not a Wikidata property id: ${JSON.stringify(pid)}`);
}

function values(qids: readonly string[]): string {
  qids.forEach(assertQid);
  return qids.map((qid) => `wd:${qid}`).join(' ');
}

/**
 * Every statement of `property` on the items, with the facts the selection
 * rule needs. `normalized` reads Wikidata's SI-converted value (psn:), so a
 * height entered in feet arrives in metres; a statement with no convertible
 * unit then has no row at all, which is the right outcome for a length that
 * forgot its unit.
 */
export function buildStatementQuery(qids: readonly string[], property: string, normalized: boolean): string {
  assertPid(property);
  const valuePredicate = normalized ? `psn:${property}` : `psv:${property}`;
  return `SELECT ?item ?st ?rank ?amount ?unit ?date ?part WHERE {
  VALUES ?item { ${values(qids)} }
  ?item p:${property} ?st .
  ?st wikibase:rank ?rank ; ${valuePredicate} ?node .
  ?node wikibase:quantityAmount ?amount ; wikibase:quantityUnit ?unit .
  OPTIONAL { ?st pq:P585 ?date }
  OPTIONAL { ?st pq:P518 ?part }
}`;
}

/** English label and English Wikipedia article for each item. */
export function buildEntityQuery(qids: readonly string[]): string {
  return `SELECT ?item ?label ?title WHERE {
  VALUES ?item { ${values(qids)} }
  OPTIONAL { ?item rdfs:label ?label . FILTER(LANG(?label) = "en") }
  OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?title . }
}`;
}

function entityId(binding: Binding | undefined): string | undefined {
  if (!binding || binding.type !== 'uri' || !binding.value.startsWith(ENTITY)) return undefined;
  const id = binding.value.slice(ENTITY.length);
  return /^[QP][1-9]\d*$/.test(id) ? id : undefined;
}

function rankOf(binding: Binding | undefined): Rank | undefined {
  switch (binding?.value) {
    case `${ONTOLOGY}PreferredRank`:
      return 'preferred';
    case `${ONTOLOGY}NormalRank`:
      return 'normal';
    case `${ONTOLOGY}DeprecatedRank`:
      return 'deprecated';
    default:
      return undefined;
  }
}

/** `2021-06-01T00:00:00Z` -> `2021-06-01`. BCE and malformed dates are ignored. */
export function dayOf(value: string | undefined): string | undefined {
  const match = value ? /^(\d{4}-\d{2}-\d{2})T/.exec(value) : null;
  return match ? match[1] : undefined;
}

/**
 * Rows to statements. One statement with two qualifiers comes back as two
 * rows, so rows are merged by statement id; a row that cannot be read is
 * dropped rather than guessed at.
 */
export function parseStatementResults(json: SparqlJson): Map<string, Statement[]> {
  const byStatement = new Map<string, { qid: string; statement: Statement }>();
  for (const row of json.results.bindings) {
    const qid = entityId(row.item);
    const id = row.st?.value;
    const rank = rankOf(row.rank);
    const amount = Number(row.amount?.value);
    const unit = row.unit?.value === '1' ? 'Q199' : entityId(row.unit);
    if (!qid || !id || !rank || !Number.isFinite(amount) || !unit) continue;

    const existing = byStatement.get(id);
    const statement = existing?.statement ?? { id, amount, unit, rank, parts: [] };
    const day = dayOf(row.date?.value);
    if (day && (!statement.pointInTime || day > statement.pointInTime)) statement.pointInTime = day;
    const part = entityId(row.part);
    if (part && !statement.parts.includes(part)) statement.parts.push(part);
    if (!existing) byStatement.set(id, { qid, statement });
  }

  const out = new Map<string, Statement[]>();
  for (const { qid, statement } of byStatement.values()) {
    out.set(qid, [...(out.get(qid) ?? []), statement]);
  }
  return out;
}

export function parseEntityResults(json: SparqlJson): Map<string, { enLabel?: string; enwikiTitle?: string }> {
  const out = new Map<string, { enLabel?: string; enwikiTitle?: string }>();
  for (const row of json.results.bindings) {
    const qid = entityId(row.item);
    if (!qid) continue;
    const entry = out.get(qid) ?? {};
    if (row.label?.value && !entry.enLabel) entry.enLabel = row.label.value;
    if (row.title?.value && !entry.enwikiTitle) entry.enwikiTitle = row.title.value;
    out.set(qid, entry);
  }
  return out;
}

/**
 * The query service answers 500/502/503/504 when it is busy, and the next
 * try usually works. A query is read-only, so trying again is always safe.
 */
export function isTransientStatus(status: number): boolean {
  return status === 500 || status === 502 || status === 503 || status === 504;
}

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

export async function sparql(
  query: string,
  fetcher: Fetcher = politeFetch,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  attempts = 4,
): Promise<SparqlJson> {
  let delayMs = 2000;
  for (let attempt = 1; ; attempt += 1) {
    const res = await fetcher(ENDPOINT, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/sparql-results+json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ query }).toString(),
    });
    if (res.ok) return (await res.json()) as SparqlJson;
    if (isTransientStatus(res.status) && attempt < attempts) {
      await wait(delayMs);
      delayMs *= 2;
      continue;
    }
    throw new Error(`Wikidata SPARQL ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

function batches<T>(list: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/**
 * Every statement of `property`, plus label and article, for each item. An
 * item with no statements still comes back (with an empty list) so the
 * caller can say WHY it was left out instead of losing it silently.
 */
export async function fetchFacts(
  qids: readonly string[],
  property: string,
  normalized: boolean,
): Promise<Map<string, EntityFacts>> {
  const unique = [...new Set(qids)];
  const out = new Map<string, EntityFacts>(unique.map((qid) => [qid, { qid, statements: [] }]));
  // Sequential on purpose: a handful of queries per build, and the public
  // endpoint is shared by everyone.
  for (const batch of batches(unique, BATCH_SIZE)) {
    const statements = parseStatementResults(await sparql(buildStatementQuery(batch, property, normalized)));
    const entities = parseEntityResults(await sparql(buildEntityQuery(batch)));
    for (const qid of batch) {
      const facts = out.get(qid)!;
      facts.statements = statements.get(qid) ?? [];
      const entity = entities.get(qid);
      if (entity?.enLabel) facts.enLabel = entity.enLabel;
      if (entity?.enwikiTitle) facts.enwikiTitle = entity.enwikiTitle;
    }
  }
  return out;
}
