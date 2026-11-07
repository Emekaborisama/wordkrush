import { describe, expect, it } from 'vitest';
import { decodeEnvelope, encodeEnvelope } from './progress';

const isNumber = (value: unknown): value is number => typeof value === 'number';

describe('progress envelope', () => {
  it('round-trips state and an optional boosted flag', () => {
    const raw = encodeEnvelope({
      session: 'level-4',
      savedAt: '2026-10-18T12:00:00.000Z',
      state: 7,
      meta: { boosted: true },
    });
    expect(JSON.parse(raw)).toEqual({
      session: 'level-4',
      savedAt: '2026-10-18T12:00:00.000Z',
      state: 7,
      meta: { boosted: true },
    });
    expect(decodeEnvelope(raw, 'level-4', isNumber)).toEqual({
      ok: true,
      state: 7,
      meta: { boosted: true },
    });
  });

  it('reads a save written before the boosted flag existed', () => {
    const raw = JSON.stringify({
      session: 3,
      savedAt: '2026-08-01T00:00:00.000Z',
      state: 1,
    });
    expect(decodeEnvelope(raw, 3, isNumber)).toEqual({ ok: true, state: 1 });
  });

  it('keeps an explicit false distinct from a missing flag', () => {
    const raw = encodeEnvelope({
      session: 'a',
      savedAt: '2026-10-18T00:00:00.000Z',
      state: 1,
      meta: { boosted: false },
    });
    expect(decodeEnvelope(raw, 'a', isNumber)).toEqual({
      ok: true,
      state: 1,
      meta: { boosted: false },
    });
  });

  it('rejects a different session, bad JSON, a failed check, and a bad flag', () => {
    const raw = encodeEnvelope({
      session: 'a',
      savedAt: '2026-10-18T00:00:00.000Z',
      state: 1,
    });
    expect(decodeEnvelope(raw, 'b', isNumber)).toEqual({ ok: false, reason: 'session' });
    expect(decodeEnvelope('{oops', 'a', isNumber)).toEqual({ ok: false, reason: 'parse' });
    expect(decodeEnvelope(raw, 'a', (value): value is number => value === 2)).toEqual({
      ok: false,
      reason: 'validation',
    });
    const badMeta = JSON.stringify({ session: 'a', savedAt: 't', state: 1, meta: { boosted: 'yes' } });
    expect(decodeEnvelope(badMeta, 'a', isNumber)).toEqual({ ok: false, reason: 'validation' });
  });
});
