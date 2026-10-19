/**
 * `fetch` that backs off when Wikimedia says "too many requests".
 *
 * Wikimedia rate-limits bursts (HTTP 429). Building several categories in a
 * row trips it, and a single refusal used to abort the whole snapshot. Waits
 * for `Retry-After` when the server sends one, otherwise doubles from one
 * second, and gives up after `attempts` tries by returning the last response.
 */
export async function politeFetch(
  url: string,
  init: RequestInit,
  attempts = 5,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<Response> {
  let delayMs = 1000;
  for (let attempt = 1; ; attempt += 1) {
    const res = await fetch(url, init);
    if (res.status !== 429 || attempt >= attempts) return res;
    const retryAfter = Number(res.headers.get('retry-after'));
    await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : delayMs);
    delayMs *= 2;
  }
}
