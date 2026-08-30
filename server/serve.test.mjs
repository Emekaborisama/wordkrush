/**
 * Share-route coverage for the Railway server.
 *
 * These routes are only reachable through HTTP — the OG tags, the status code
 * for a junk share id, and the cache headers are all response-level facts, so
 * the suite warms the real server and drives `handleRequest` over a loopback
 * socket rather than asserting on strings a helper returned.
 *
 * The homepage `index.html` fixture is built with the same
 * `applySearchSurface` that `build:web` runs, so "share HTML strips the
 * homepage tags" is checked against the head the site actually ships.
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { applySearchSurface } from '../scripts/patch-web-head.mjs';

const HOMEPAGE_OG_IMAGE = 'https://wordkrush.com/og-image.png?v=deadbeef01';

const INDEX_HTML = applySearchSurface(
  '<!DOCTYPE html><html><head><title>wordkrush</title></head><body><div id="root"></div></body></html>',
  { ogImageUrl: HOMEPAGE_OG_IMAGE },
);

/** URL-safe base64 the same way `src/games/share-data.ts` encodes it. */
function shareId(data) {
  return Buffer.from(JSON.stringify(data), 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '~');
}

const RESULTS = {
  'more-or-less': { game: 'more-or-less', streak: 7, bestStreak: 12 },
  clueless: {
    game: 'clueless',
    puzzleNumber: 29,
    levelName: 'Departure Board',
    guessCount: 4,
    heatBuckets: { unranked: 1, cold: 1, top_100: 1, top_10: 0, win: 1 },
  },
  wordfall: {
    game: 'wordfall',
    levelNumber: 6,
    levelName: 'Tide Line',
    score: 4820,
    wordCount: 9,
    lengthBuckets: { under_3: 0, '3_4': 4, '5_7': 4, '8_plus': 1 },
    won: true,
  },
};

let root;
let server;
let origin;
let version;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'wordkrush-serve-'));
  await writeFile(join(root, 'index.html'), INDEX_HTML);

  // `serve.mjs` reads STATIC_ROOT once, at import time.
  process.env.STATIC_ROOT = root;
  const { warm, handleRequest } = await import('./serve.mjs');
  await warm();

  version = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf-8'),
  ).version;

  server = createServer(handleRequest);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (root) await rm(root, { recursive: true, force: true });
});

function maxAgeOf(response) {
  const directive = /max-age=(\d+)/.exec(response.headers.get('cache-control') ?? '');
  return directive ? Number(directive[1]) : null;
}

describe('/share/:id Open Graph tags', () => {
  it('points og:image and twitter:image at a version-stamped URL', async () => {
    const id = shareId(RESULTS['more-or-less']);
    const html = await (await fetch(`${origin}/share/${id}`)).text();
    const stamped = `https://wordkrush.com/share/${id}/og.png?v=${version}`;

    expect(html).toContain(`<meta property="og:image" content="${stamped}"/>`);
    expect(html).toContain(`<meta name="twitter:image" content="${stamped}"/>`);
  });

  it('leaves og:url unstamped so the shared page URL stays clean', async () => {
    const id = shareId(RESULTS['more-or-less']);
    const html = await (await fetch(`${origin}/share/${id}`)).text();

    expect(html).toContain(
      `<meta property="og:url" content="https://wordkrush.com/share/${id}"/>`,
    );
  });

  it('strips the homepage image, canonical, and title from share HTML', async () => {
    const id = shareId(RESULTS.wordfall);
    const html = await (await fetch(`${origin}/share/${id}`)).text();

    expect(html).not.toContain(HOMEPAGE_OG_IMAGE);
    expect(html).not.toContain('og-image.png');
    expect(html).not.toContain('rel="canonical"');
    expect(html).toContain('<title>WordKrush · Wordfall</title>');
  });

  it('describes the result with the standing line only', async () => {
    const id = shareId(RESULTS.clueless);
    const html = await (await fetch(`${origin}/share/${id}`)).text();

    expect(html).toContain(
      '<meta property="og:description" content="Found it in 4"/>',
    );
  });

  it('404s an unparseable share id instead of serving the SPA', async () => {
    expect((await fetch(`${origin}/share/nope`)).status).toBe(404);
  });

  it('404s a share id whose payload names no game', async () => {
    expect((await fetch(`${origin}/share/${shareId({ streak: 3 })}`)).status).toBe(404);
  });
});

describe('/share/:id/og.png', () => {
  it.each(Object.keys(RESULTS))('renders %s as a 1200×630 PNG', async (game) => {
    const id = shareId(RESULTS[game]);
    const response = await fetch(`${origin}/share/${id}/og.png?v=${version}`);
    const png = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });

  it('caches for minutes, not a day, so a render fix lands the same day', async () => {
    const id = shareId(RESULTS['more-or-less']);
    const response = await fetch(`${origin}/share/${id}/og.png?v=${version}`);

    expect(maxAgeOf(response)).toBeLessThanOrEqual(300);
  });

  it('serves the same render whatever the cache-bust stamp says', async () => {
    const id = shareId(RESULTS['more-or-less']);
    const [stamped, bare, stale] = await Promise.all([
      fetch(`${origin}/share/${id}/og.png?v=${version}`),
      fetch(`${origin}/share/${id}/og.png`),
      fetch(`${origin}/share/${id}/og.png?v=0.0.1`),
    ]);

    expect(stamped.headers.get('etag')).toBe(bare.headers.get('etag'));
    expect(stale.headers.get('etag')).toBe(bare.headers.get('etag'));
  });

  it('404s an invalid share id even with a valid stamp', async () => {
    const response = await fetch(`${origin}/share/nope/og.png?v=${version}`);

    expect(response.status).toBe(404);
  });
});
