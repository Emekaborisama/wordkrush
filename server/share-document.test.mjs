/**
 * The share page as a document, and the boot check that guards it.
 *
 * `serve.test.mjs` drives the real server over loopback for the response
 * contract. This suite covers the two things that need their own module
 * instance: the pure rewrite, and `warm()` refusing a shell the build script
 * no longer marks.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  COPY_MARKERS,
  HEAD_MARKERS,
  PAGE_DESCRIPTION,
  PAGE_TITLE,
  applySearchSurface,
  applyViewportCss,
} from '../scripts/patch-web-head.mjs';
import { cardId, cardImagePath } from './og-card.mjs';
import { hasShareMarkers, shareDocument } from './share-document.mjs';

const SHELL = applyViewportCss(
  applySearchSurface(
    '<!DOCTYPE html><html><head><title>wordkrush</title></head><body><div id="root"></div></body></html>',
    { ogImageUrl: 'https://wordkrush.com/og-image.png?v=deadbeef01' },
  ),
);

const RESULT = { game: 'more-or-less', streak: 7, bestStreak: 12 };

function shareFrom(shell = SHELL) {
  return shareDocument(shell, {
    shareId: 'abc~',
    shareData: RESULT,
    description: 'Streak 7 · best 12',
    imageVersion: '9.9.9',
  });
}

describe('the built shell', () => {
  it('carries the delimiters the server replaces', () => {
    for (const marker of [...HEAD_MARKERS, ...COPY_MARKERS]) {
      expect(SHELL).toContain(marker);
    }
    expect(hasShareMarkers(SHELL)).toBe(true);
  });

  it('is not mistaken for a marked shell when a marker is missing', () => {
    expect(hasShareMarkers('<html><head><title>x</title></head><body></body></html>')).toBe(false);
    expect(hasShareMarkers(SHELL.replaceAll(COPY_MARKERS[0], ''))).toBe(false);
    expect(hasShareMarkers(SHELL.replaceAll(HEAD_MARKERS[1], ''))).toBe(false);
  });

  it('keeps the layout CSS outside the head block, where a swap cannot reach it', () => {
    // Anchored after `</title>` it sat inside the block, so replacing the
    // block would have taken the web build's layout with it.
    const [, headEnd] = HEAD_MARKERS;
    expect(SHELL).toContain(`${headEnd}<style id="wk-web-viewport"`);
  });
});

describe('the share document', () => {
  it('replaces both copies of the hub blurb, not just the first', () => {
    // The build script writes the crawler-readable copy twice: once in
    // `<noscript>` and once in `#root`. A single replace left the second one
    // describing the homepage.
    const html = shareFrom();

    expect(html.match(/<h1>WordKrush · More or Less<\/h1>/g)).toHaveLength(2);
    expect(html).not.toContain(PAGE_DESCRIPTION);
    expect(html).not.toContain('Choose your game');
  });

  it('leaves no trace of the hub in the head', () => {
    const html = shareFrom();

    expect(html).not.toContain(PAGE_TITLE);
    expect(html).not.toContain('application/ld+json');
    expect(html).not.toContain('og-image.png');
    expect(html).not.toContain('https://wordkrush.com/"');
    expect(html).not.toContain(HEAD_MARKERS[0]);
    expect(html).not.toContain(COPY_MARKERS[0]);
  });

  it('points the page URLs at the share id it was given', () => {
    const html = shareFrom();

    expect(html).toContain('<meta property="og:url" content="https://wordkrush.com/share/abc~"/>');
    expect(html).toContain('<link rel="canonical" href="https://wordkrush.com/share/abc~"/>');
  });

  it('points the card at the short path, not at the share id', () => {
    const html = shareFrom();
    const stamped = `https://wordkrush.com${cardImagePath(cardId(RESULT))}?v=9.9.9`;

    // A scraper fetches whatever `og:image` says. The nested
    // `/share/{token}/og.png` put the whole result payload in that URL; the
    // card id carries only the two photos a More or Less board draws.
    expect(stamped).toMatch(/\/og\/share\/m_[a-z0-9-]+_[a-z0-9-]+\.png\?v=9\.9\.9$/);
    expect(html).toContain(`<meta property="og:image" content="${stamped}"/>`);
    expect(html).toContain(`<meta property="og:image:secure_url" content="${stamped}"/>`);
    expect(html).toContain(`<meta name="twitter:image" content="${stamped}"/>`);
    expect(html).not.toContain('/share/abc~/og.png');
  });

  it('escapes a description before it reaches an attribute', () => {
    const html = shareDocument(SHELL, {
      shareId: 'abc',
      shareData: RESULT,
      description: 'Streak 7 "quoted" & <script>',
      imageVersion: '1.0.0',
    });

    expect(html).toContain('content="Streak 7 &quot;quoted&quot; &amp; &lt;script&gt;"');
    expect(html).not.toContain('<script>');
  });
});

describe('warming a shell the build script no longer marks', () => {
  let root;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'wordkrush-unmarked-'));
    await writeFile(
      join(root, 'index.html'),
      '<!DOCTYPE html><html><head><title>wordkrush</title></head><body></body></html>',
    );
    // `serve.mjs` reads STATIC_ROOT once, at import time.
    process.env.STATIC_ROOT = root;
  });

  afterAll(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it('fails at boot instead of serving the homepage description forever', async () => {
    const { warm } = await import('./serve.mjs');

    await expect(warm()).rejects.toThrow(/share-document markers/);
  });
});
