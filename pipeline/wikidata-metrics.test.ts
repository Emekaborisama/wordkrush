import { describe, expect, it } from 'vitest';
import type { Statement } from './sources/wikidata';
import { MAX_DISAGREEMENT, METRICS, selectValue, UNIT } from './wikidata-metrics';

let next = 0;
const st = (over: Partial<Statement> & Pick<Statement, 'amount'>): Statement => ({
  id: `s${next++}`,
  unit: UNIT.metre,
  rank: 'normal',
  parts: [],
  ...over,
});

describe('selectValue — on statements seen on real items', () => {
  it("drops a deprecated figure: Russia's area with Crimea", () => {
    const russia = [
      st({ amount: 17_125_191e6, unit: UNIT.squareMetre, rank: 'deprecated', pointInTime: '2017-01-01' }),
      st({ amount: 17_075_400e6, unit: UNIT.squareMetre, pointInTime: '2014-01-01' }),
    ];
    expect(selectValue(russia, METRICS.area)).toEqual({ ok: true, value: 17_075_400, from: 1 });
  });

  it('takes the preferred elevation of Everest over five others', () => {
    const everest = [
      st({ amount: 8848.361418, rank: 'deprecated' }),
      st({ amount: 8848.86, rank: 'preferred', parts: ['Q-snow'] }),
      st({ amount: 8848 }),
      st({ amount: 8850 }),
      st({ amount: 8844.43, parts: ['Q-rock'], pointInTime: '2005-01-01' }),
      st({ amount: 8847.93, parts: ['Q-snow'], pointInTime: '2005-01-01' }),
    ];
    expect(selectValue(everest, METRICS.elevation)).toEqual({ ok: true, value: 8849, from: 1 });
  });

  it("ignores the Nile's 2,850 km once a preferred length exists", () => {
    const nile = [
      st({ amount: 6_650_000, rank: 'preferred', parts: ['Q-drainage'], pointInTime: '2015-01-01' }),
      st({ amount: 2_850_000 }),
    ];
    expect(selectValue(nile, METRICS.length)).toEqual({ ok: true, value: 6650, from: 1 });
  });

  it('calls a river disputed when nothing settles 6,650 against 2,850', () => {
    const unsettled = [st({ amount: 6_650_000 }), st({ amount: 2_850_000 })];
    expect(selectValue(unsettled, METRICS.length)).toEqual({ ok: false, reason: 'disputed', values: [6650, 2850] });
  });

  it('takes the newest population when none is preferred, and says when it is from', () => {
    const country = [
      st({ amount: 182_202_000, unit: UNIT.one, pointInTime: '2015-01-01' }),
      st({ amount: 190_886_311, unit: UNIT.one, pointInTime: '2017-01-01' }),
      st({ amount: 211_400_708, unit: UNIT.one, pointInTime: '2021-06-01' }),
      st({ amount: 999, unit: UNIT.one }),
    ];
    expect(selectValue(country, METRICS.population)).toEqual({
      ok: true,
      value: 211_400_708,
      from: 1,
      pointInTime: '2021-06-01',
    });
  });

  it("keeps the editors' preferred population even when a newer estimate exists", () => {
    // Iceland: a normal-rank 2022 figure and a preferred 2019 one.
    const iceland = [
      st({ amount: 376_248, unit: UNIT.one, pointInTime: '2022-01-01' }),
      st({ amount: 364_260, unit: UNIT.one, rank: 'preferred', pointInTime: '2019-12-31' }),
    ];
    expect(selectValue(iceland, METRICS.population)).toMatchObject({ ok: true, value: 364_260 });
  });

  it('prefers a total over a part when no figure is preferred', () => {
    const country = [
      st({ amount: 9_833_520e6, unit: UNIT.squareMetre }),
      st({ amount: 9_147_593e6, unit: UNIT.squareMetre, parts: ['Q-land'] }),
    ];
    expect(selectValue(country, METRICS.area)).toEqual({ ok: true, value: 9_833_520, from: 1 });
  });

  it('settles small disagreements on the median', () => {
    const tower = [st({ amount: 324 }), st({ amount: 330 }), st({ amount: 300 })];
    expect(selectValue(tower, METRICS.height)).toEqual({ ok: true, value: 324, from: 3 });
    expect(330 / 300).toBeLessThan(MAX_DISAGREEMENT);
  });

  it('refuses the wrong unit, a zero, and an empty list', () => {
    expect(selectValue([st({ amount: 5, unit: 'Q-foot' })], METRICS.height)).toEqual({ ok: false, reason: 'missing', values: [] });
    expect(selectValue([st({ amount: 0 })], METRICS.height)).toEqual({ ok: false, reason: 'missing', values: [] });
    expect(selectValue([], METRICS.population)).toEqual({ ok: false, reason: 'missing', values: [] });
    // 0.4 m² rounds to 0 km² at two decimals: not a playable value.
    expect(selectValue([st({ amount: 0.4, unit: UNIT.squareMetre })], METRICS.area)).toMatchObject({ ok: false, reason: 'missing' });
  });

  it('keeps small areas to two decimals', () => {
    const vatican = [st({ amount: 440_000, unit: UNIT.squareMetre })];
    expect(selectValue(vatican, METRICS.area)).toEqual({ ok: true, value: 0.44, from: 1 });
  });
});
