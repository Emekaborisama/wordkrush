import { describe, expect, it } from 'vitest';
import { createReportBudget, toWebVitalsEvent } from './vitals';

describe('toWebVitalsEvent', () => {
  it('rounds every reading and scales layout shift to an integer', () => {
    expect(toWebVitalsEvent({ lcp: 1834.6, inp: 96.2, cls: 0.0427, ttfb: 211.9 })).toEqual({
      lcp_ms: 1835,
      inp_ms: 96,
      cls_milli: 43,
      ttfb_ms: 212,
    });
  });

  it('drops impossible readings rather than sending them', () => {
    expect(toWebVitalsEvent({ lcp: -1, inp: Number.NaN, cls: 0, ttfb: 600_000 })).toBeNull();
  });

  it('sends only what was measured', () => {
    expect(toWebVitalsEvent({ cls: 0, ttfb: 120 })).toEqual({ ttfb_ms: 120 });
  });
});

describe('createReportBudget', () => {
  it('allows the first reports and refuses the rest', () => {
    const allow = createReportBudget(2);
    expect([allow(), allow(), allow()]).toEqual([true, true, false]);
  });
});
