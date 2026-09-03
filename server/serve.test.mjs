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

import {
  PAGE_DESCRIPTION,
  PAGE_TITLE,
  applySearchSurface,
  applyViewportCss,
} from '../scripts/patch-web-head.mjs';

const HOMEPAGE_OG_IMAGE = 'https://wordkrush.com/og-image.png?v=deadbeef01';

const INDEX_HTML = applyViewportCss(
  applySearchSurface(
    '<!DOCTYPE html><html><head><title>wordkrush</title></head><body><div id="root"></div></body></html>',
    { ogImageUrl: HOMEPAGE_OG_IMAGE },
  ),
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

  it('leaves nothing on the page that describes the homepage', async () => {
    const id = shareId(RESULTS.wordfall);
    const html = await (await fetch(`${origin}/share/${id}`)).text();

    // Removing the `og:*` tags by pattern left the hub's description, its
    // JSON-LD (`url: https://wordkrush.com/`) and its "Choose your game" copy
    // in place, so one document described both a result and the whole site.
    expect(html).not.toContain(HOMEPAGE_OG_IMAGE);
    expect(html).not.toContain('og-image.png');
    expect(html).not.toContain(PAGE_TITLE);
    expect(html).not.toContain(PAGE_DESCRIPTION);
    expect(html).not.toContain('application/ld+json');
    expect(html).not.toContain('Choose your game');
    expect(html).not.toContain('https://wordkrush.com/"');
  });

  it('describes the result, in the head and in the crawler-readable copy', async () => {
    const id = shareId(RESULTS.clueless);
    const html = await (await fetch(`${origin}/share/${id}`)).text();

    expect(html).toContain('<title>WordKrush · Clueless</title>');
    expect(html).toContain('<meta property="og:description" content="Found it in 4"/>');
    expect(html).toContain('<meta name="description" content="Found it in 4"/>');
    expect(html).toContain(`<link rel="canonical" href="https://wordkrush.com/share/${id}"/>`);
    expect(html).toContain('<h1>WordKrush · Clueless</h1>');
  });

  it('declares the card X needs: a large summary, sized, typed and described', async () => {
    const id = shareId(RESULTS['more-or-less']);
    const html = await (await fetch(`${origin}/share/${id}`)).text();

    expect(html).toContain('<meta name="twitter:card" content="summary_large_image"/>');
    expect(html).toContain('<meta name="twitter:site" content="@WordKrushGame"/>');
    expect(html).toContain('<meta property="og:image:type" content="image/png"/>');
    expect(html).toContain('<meta property="og:image:width" content="1200"/>');
    expect(html).toContain('<meta property="og:image:height" content="630"/>');
    expect(html).toMatch(/<meta property="og:image:alt" content="A More or Less board[^"]*"\/>/);
    expect(html).toMatch(/<meta name="twitter:image:alt" content="A More or Less board[^"]*"\/>/);
  });

  it('still serves the playable page, so a player who clicks lands in the game', async () => {
    const id = shareId(RESULTS['more-or-less']);
    const html = await (await fetch(`${origin}/share/${id}`)).text();

    // Only the parts that make a claim about this page are rewritten. Sweeping
    // out the layout CSS or the bundle with them would trade a dead card for a
    // dead link.
    expect(html).toContain('id="wk-web-viewport"');
    expect(html).toContain('<div id="root">');
  });

  it('404s an unparseable share id instead of serving the SPA', async () => {
    expect((await fetch(`${origin}/share/nope`)).status).toBe(404);
  });

  it('404s a share id whose payload names no game', async () => {
    expect((await fetch(`${origin}/share/${shareId({ streak: 3 })}`)).status).toBe(404);
  });
});

describe('share ids as they actually arrive', () => {
  /** A payload whose base64 needs `=` padding, so its id carries `~`. */
  const PADDED = { game: 'more-or-less', streak: 0, bestStreak: 0 };

  it('resolves an id whose ~ arrived percent-encoded', async () => {
    const id = shareId(PADDED);
    expect(id).toContain('~');
    const escaped = id.replaceAll('~', '%7E');

    // `~` is legal but unreserved, and anything that normalises it to `%7E`
    // was asking for an id this server had never heard of.
    const [page, image] = await Promise.all([
      fetch(`${origin}/share/${escaped}`),
      fetch(`${origin}/share/${escaped}/og.png`),
    ]);

    expect(page.status).toBe(200);
    expect(image.status).toBe(200);
  });

  it('resolves an id whose padding was cut off in a composer', async () => {
    const id = shareId(PADDED);
    const clipped = id.replace(/~+$/, '');

    // `twitter-text`, the library X's own composer uses to find links in a
    // draft, allows `~` inside a URL but not at the end of one, so a padded
    // id reaches a scraper with its tail — and its query string — removed.
    const [page, image] = await Promise.all([
      fetch(`${origin}/share/${clipped}`),
      fetch(`${origin}/share/${clipped}/og.png`),
    ]);

    expect(page.status).toBe(200);
    expect(image.status).toBe(200);
  });

  it('declares the canonical id whatever spelling was requested', async () => {
    const id = shareId(PADDED);
    const html = await (await fetch(`${origin}/share/${id.replaceAll('~', '%7E')}`)).text();

    expect(html).toContain(`<meta property="og:url" content="https://wordkrush.com/share/${id}"/>`);
    expect(html).not.toContain('%7E');
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
    const maxAge = maxAgeOf(response);

    // A missing directive would satisfy `<= 300` by coercion, and max-age=0
    // would re-render on every scrape, so pin both ends.
    expect(maxAge).toBeTypeOf('number');
    expect(maxAge).toBeGreaterThan(0);
    expect(maxAge).toBeLessThanOrEqual(300);
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

  it('does not claim to vary on a header it never reads', async () => {
    const id = shareId(RESULTS.clueless);
    const response = await fetch(`${origin}/share/${id}/og.png`);

    // One PNG, served uncompressed. `Vary: Accept-Encoding` on it tells every
    // cache between here and the scraper to key on nothing.
    expect(response.headers.get('vary')).toBeNull();
    expect(response.headers.get('content-encoding')).toBeNull();
  });

  it('keeps the card in memory so a burst of scrapers does not re-render it', async () => {
    const id = shareId(RESULTS.wordfall);
    const first = await fetch(`${origin}/share/${id}/og.png`);
    const firstBody = Buffer.from(await first.arrayBuffer());

    const second = await fetch(`${origin}/share/${id}/og.png`);
    const secondBody = Buffer.from(await second.arrayBuffer());

    expect(second.headers.get('etag')).toBe(first.headers.get('etag'));
    expect(secondBody.equals(firstBody)).toBe(true);
  });

  it('404s an invalid share id even with a valid stamp', async () => {
    const response = await fetch(`${origin}/share/nope/og.png?v=${version}`);

    expect(response.status).toBe(404);
  });
});
