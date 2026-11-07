import type { AnalyticsEvents } from './events';

/** What the web observer collected during one page view. Milliseconds, except `cls`. */
export type VitalsSample = {
  lcp?: number;
  inp?: number;
  cls: number;
  ttfb?: number;
};

/** Anything past a minute is a stuck tab or a sleeping laptop, not a real reading. */
const MAX_MS = 60_000;

function ms(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value < 0 || value > MAX_MS) return undefined;
  return Math.round(value);
}

/**
 * Turns a page view's sample into the `web_vitals` event: rounded, with
 * impossible readings dropped. `null` when nothing was measured, so an empty
 * event is never sent.
 */
export function toWebVitalsEvent(sample: VitalsSample): AnalyticsEvents['web_vitals'] | null {
  const event: AnalyticsEvents['web_vitals'] = {};
  const lcp = ms(sample.lcp);
  const inp = ms(sample.inp);
  const ttfb = ms(sample.ttfb);
  if (lcp !== undefined) event.lcp_ms = lcp;
  if (inp !== undefined) event.inp_ms = inp;
  if (ttfb !== undefined) event.ttfb_ms = ttfb;
  if (Number.isFinite(sample.cls) && sample.cls > 0 && sample.cls < 100) event.cls_milli = Math.round(sample.cls * 1000);
  return Object.keys(event).length > 0 ? event : null;
}

/** Allows at most `max` reports, so one broken loop cannot flood analytics. */
export function createReportBudget(max: number): () => boolean {
  let used = 0;
  return () => {
    if (used >= max) return false;
    used += 1;
    return true;
  };
}
