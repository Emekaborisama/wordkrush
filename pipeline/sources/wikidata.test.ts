import { describe, expect, it } from 'vitest';
import {
  assertQid,
  buildEntityQuery,
  buildStatementQuery,
  dayOf,
  parseEntityResults,
  parseStatementResults,
  sparql,
  type SparqlJson,
} from './wikidata';

const uri = (value: string) => ({ type: 'uri', value });
const lit = (value: string) => ({ type: 'literal', value });
const E = 'http://www.wikidata.org/entity/';
const R = 'http://wikiba.se/ontology#';

describe('query building', () => {
  it('asks for every statement with its rank, unit, date and part', () => {
    const query = buildStatementQuery(['Q148', 'Q668'], 'P1082', false);
    expect(query).toContain('VALUES ?item { wd:Q148 wd:Q668 }');
    expect(query).toContain('?item p:P1082 ?st');
    expect(query).toContain('psv:P1082 ?node');
    expect(query).toContain('pq:P585');
    expect(query).toContain('pq:P518');
    expect(buildStatementQuery(['Q513'], 'P2044', true)).toContain('psn:P2044 ?node');
  });

  it('refuses anything that is not an id, since ids go into query text', () => {
    expect(() => buildStatementQuery(['Q148 } DELETE'], 'P1082', false)).toThrow(/not a Wikidata item id/);
    expect(() => buildStatementQuery(['Q148'], 'P1082; drop', false)).toThrow(/property id/);
    expect(() => buildEntityQuery(['q148'])).toThrow();
    expect(() => assertQid('Q0')).toThrow();
    expect(() => assertQid('Q42')).not.toThrow();
  });
});

describe('parseStatementResults', () => {
  it('merges the rows of one statement and reads rank, unit, date and parts', () => {
    const json: SparqlJson = {
      results: {
        bindings: [
          {
            item: uri(`${E}Q243`),
            st: uri(`${E}statement/Q243-a`),
            rank: uri(`${R}PreferredRank`),
            amount: lit('330'),
            unit: uri(`${E}Q11573`),
            part: uri(`${E}Q1`),
          },
          {
            item: uri(`${E}Q243`),
            st: uri(`${E}statement/Q243-a`),
            rank: uri(`${R}PreferredRank`),
            amount: lit('330'),
            unit: uri(`${E}Q11573`),
            part: uri(`${E}Q2`),
            date: lit('2022-03-15T00:00:00Z'),
          },
          {
            item: uri(`${E}Q243`),
            st: uri(`${E}statement/Q243-b`),
            rank: uri(`${R}DeprecatedRank`),
            amount: lit('300'),
            unit: uri(`${E}Q11573`),
          },
          {
            item: uri(`${E}Q148`),
            st: uri(`${E}statement/Q148-a`),
            rank: uri(`${R}NormalRank`),
            amount: lit('1404890000'),
            unit: lit('1'),
          },
        ],
      },
    };
    const parsed = parseStatementResults(json);
    expect(parsed.get('Q243')).toEqual([
      { id: `${E}statement/Q243-a`, amount: 330, unit: 'Q11573', rank: 'preferred', parts: ['Q1', 'Q2'], pointInTime: '2022-03-15' },
      { id: `${E}statement/Q243-b`, amount: 300, unit: 'Q11573', rank: 'deprecated', parts: [] },
    ]);
    // A plain count comes back with the unit "1".
    expect(parsed.get('Q148')).toEqual([
      { id: `${E}statement/Q148-a`, amount: 1_404_890_000, unit: 'Q199', rank: 'normal', parts: [] },
    ]);
  });

  it('drops a row it cannot read rather than guessing', () => {
    const json: SparqlJson = {
      results: {
        bindings: [
          { item: uri(`${E}Q1`), st: uri(`${E}statement/x`), rank: uri(`${R}OddRank`), amount: lit('1'), unit: uri(`${E}Q199`) },
          { item: uri(`${E}Q1`), st: uri(`${E}statement/y`), rank: uri(`${R}NormalRank`), amount: lit('abc'), unit: uri(`${E}Q199`) },
          { item: lit('Q1'), st: uri(`${E}statement/z`), rank: uri(`${R}NormalRank`), amount: lit('1'), unit: uri(`${E}Q199`) },
        ],
      },
    };
    expect(parseStatementResults(json).size).toBe(0);
  });
});

describe('parseEntityResults', () => {
  it('reads the English label and Wikipedia title', () => {
    const json: SparqlJson = {
      results: {
        bindings: [
          { item: uri(`${E}Q148`), label: lit("People's Republic of China"), title: lit('China') },
          { item: uri(`${E}Q999`) },
        ],
      },
    };
    expect(parseEntityResults(json)).toEqual(
      new Map([
        ['Q148', { enLabel: "People's Republic of China", enwikiTitle: 'China' }],
        ['Q999', {}],
      ]),
    );
  });
});

describe('sparql', () => {
  const ok = () => new Response(JSON.stringify({ results: { bindings: [] } }), { status: 200 });
  const status = (code: number) => new Response('busy', { status: code });

  it('tries again after a busy gateway, backing off', async () => {
    const responses = [status(502), status(503), ok()];
    const waits: number[] = [];
    const json = await sparql(
      'SELECT * WHERE {}',
      async () => responses.shift()!,
      async (ms) => {
        waits.push(ms);
      },
    );
    expect(json).toEqual({ results: { bindings: [] } });
    expect(waits).toEqual([2000, 4000]);
  });

  it('gives up after the last attempt, and never retries a bad query', async () => {
    const noWait = async () => {};
    await expect(sparql('q', async () => status(504), noWait, 3)).rejects.toThrow(/504/);
    let calls = 0;
    await expect(
      sparql(
        'q',
        async () => {
          calls += 1;
          return status(400);
        },
        noWait,
      ),
    ).rejects.toThrow(/400/);
    expect(calls).toBe(1);
  });

  it('sends the query as a form POST with an identifying User-Agent', async () => {
    let seen: RequestInit | undefined;
    await sparql('SELECT ?x WHERE {}', async (_url, init) => {
      seen = init;
      return ok();
    });
    expect(seen?.method).toBe('POST');
    expect(new Headers(seen?.headers).get('User-Agent')).toMatch(/wordkrush/);
    expect(String(seen?.body)).toContain('query=SELECT');
  });
});

describe('dayOf', () => {
  it('keeps the calendar day and ignores what it cannot read', () => {
    expect(dayOf('2021-06-01T00:00:00Z')).toBe('2021-06-01');
    expect(dayOf('-0500-01-01T00:00:00Z')).toBeUndefined();
    expect(dayOf(undefined)).toBeUndefined();
  });
});
