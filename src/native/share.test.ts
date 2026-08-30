/**
 * Covers the web twin (`share.ts`) — the platform Metro picks for web and
 * the one Vitest resolves here. `share.native.ts` needs a device.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareResult } from './share';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('shareResult', () => {
  it('uses the Web Share API when it is available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });
    await expect(shareResult('hello')).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'hello' });
  });

  it('treats a dismissed share sheet as dismissed, not failed', async () => {
    const abort = new Error('Share canceled');
    abort.name = 'AbortError';
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(abort),
      clipboard: { writeText: vi.fn() },
    });
    await expect(shareResult('hello')).resolves.toBe('dismissed');
  });

  it('falls back to the clipboard when Web Share is missing', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(shareResult('hello')).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to the clipboard when Web Share rejects for a reason other than abort', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
      clipboard: { writeText },
    });
    await expect(shareResult('hello')).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('fails quietly when neither path exists', async () => {
    vi.stubGlobal('navigator', {});
    await expect(shareResult('hello')).resolves.toBe('failed');
  });

  it('fails quietly when the clipboard rejects', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('blocked')) },
    });
    await expect(shareResult('hello')).resolves.toBe('failed');
  });

  it('fails quietly when there is no navigator at all', async () => {
    vi.stubGlobal('navigator', undefined);
    await expect(shareResult('hello')).resolves.toBe('failed');
  });
});
