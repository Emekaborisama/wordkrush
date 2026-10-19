import { afterEach, describe, expect, it, vi } from 'vitest';
import { politeFetch } from './politeFetch';

function response(status: number, headers: Record<string, string> = {}): Response {
  return new Response(status === 200 ? '{}' : 'slow down', { status, headers });
}

describe('politeFetch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('retries a 429 until the server answers', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(429)).mockResolvedValueOnce(response(429)).mockResolvedValueOnce(response(200));
    vi.stubGlobal('fetch', fetchMock);
    const waits: number[] = [];
    const res = await politeFetch('https://x.test', {}, 5, async (ms) => {
      waits.push(ms);
    });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(waits).toEqual([1000, 2000]);
  });

  it('honours Retry-After', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(429, { 'retry-after': '7' })).mockResolvedValueOnce(response(200)));
    const waits: number[] = [];
    await politeFetch('https://x.test', {}, 5, async (ms) => {
      waits.push(ms);
    });
    expect(waits).toEqual([7000]);
  });

  it('gives up after the last attempt and returns the refusal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(429));
    vi.stubGlobal('fetch', fetchMock);
    const res = await politeFetch('https://x.test', {}, 3, async () => {});
    expect(res.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry other errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(404));
    vi.stubGlobal('fetch', fetchMock);
    const res = await politeFetch('https://x.test', {}, 5, async () => {});
    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
