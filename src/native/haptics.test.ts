/**
 * Covers the web twin (`haptics.ts`) — the platform Metro picks for web and
 * the one Vitest resolves here. `haptics.native.ts` needs a device, so its
 * `canVibrate` is a constant and there is nothing to assert.
 *
 * The gate is what matters: it decides both whether a buzz fires and whether
 * the drawer offers the switch at all, so a wrong answer either silences a
 * capable phone or shows a dead toggle.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canVibrate, tapCelebrate, tapSelect, tapWrong } from './haptics';

/** A touch device whose browser has the Vibration API — the case that buzzes. */
function touchDevice(vibrate = vi.fn()) {
  vi.stubGlobal('navigator', { vibrate });
  vi.stubGlobal('window', { matchMedia: (q: string) => ({ matches: q.includes('coarse') }) });
  return vibrate;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('canVibrate', () => {
  it('is true on a touch device with the Vibration API', () => {
    touchDevice();
    expect(canVibrate()).toBe(true);
  });

  it('is false in Safari and on iOS, where navigator.vibrate does not exist', () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    expect(canVibrate()).toBe(false);
  });

  it('is false on a laptop, where the pointer is fine even though vibrate exists', () => {
    // Desktop Chrome exposes navigator.vibrate and silently does nothing, so
    // without the pointer check the drawer would offer a switch that can never
    // fire. This is the "feels wrong on a laptop" half of the old rationale.
    vi.stubGlobal('navigator', { vibrate: vi.fn() });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    expect(canVibrate()).toBe(false);
  });

  it('is false when matchMedia throws rather than letting it escape', () => {
    vi.stubGlobal('navigator', { vibrate: vi.fn() });
    vi.stubGlobal('window', {
      matchMedia: () => {
        throw new Error('not implemented');
      },
    });
    expect(canVibrate()).toBe(false);
  });

  it('is false when there is no navigator at all', () => {
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('window', undefined);
    expect(canVibrate()).toBe(false);
  });
});

describe('patterns', () => {
  it('sends the stuttered pattern for a rejection', async () => {
    const vibrate = touchDevice();
    await tapWrong();
    expect(vibrate).toHaveBeenCalledWith([35, 45, 35]);
  });

  it('keeps the per-letter tick tiny, since it fires once per traced letter', async () => {
    const vibrate = touchDevice();
    await tapSelect();
    const [pattern] = vibrate.mock.calls[0] as [number];
    expect(pattern).toBeLessThanOrEqual(12);
  });

  it('rises across the celebration beats', async () => {
    const vibrate = touchDevice();
    await tapCelebrate();
    const [pattern] = vibrate.mock.calls[0] as [number[]];
    const buzzes = pattern.filter((_, i) => i % 2 === 0);
    expect(buzzes).toEqual([...buzzes].sort((a, b) => a - b));
  });
});

describe('when the device cannot vibrate', () => {
  it('stays silent instead of throwing', async () => {
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    await expect(tapWrong()).resolves.toBeUndefined();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('swallows a browser that rejects the call', async () => {
    touchDevice(
      vi.fn(() => {
        throw new Error('blocked before user gesture');
      }),
    );
    // A rejected buzz must never interrupt a run.
    await expect(tapCelebrate()).resolves.toBeUndefined();
  });
});
