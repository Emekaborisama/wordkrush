import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  CANONICAL_URL,
  COPY_MARKERS,
  GAMES,
  GOOGLE_VERIFICATION_BODY,
  GOOGLE_VERIFICATION_FILE,
  HEAD_MARKERS,
  HUB_SUBTITLE,
  PAGE_DESCRIPTION,
  PAGE_TITLE,
  SAME_AS,
  SITE_URL,
  applySearchSurface,
  applyViewportCss,
  documentMeta,
  googleVerificationMeta,
  jsonLdGraph,
  landingHtml,
  robotsTxt,
  sitemapXml,
} from './patch-web-head.mjs';

const FIXTURE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>WordKrush</title>
    <link rel="icon" href="/favicon.ico"/>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`;

describe('branded search surface', () => {
  it('names the three games in the document title', () => {
    expect(PAGE_TITLE).toContain('More or Less');
    expect(PAGE_TITLE).toContain('Clueless');
    expect(PAGE_TITLE).toContain('Wordfall');
    expect(documentMeta()).toContain(`<title>${PAGE_TITLE}</title>`);
  });

  it('emits a canonical, description, and JSON-LD for the official host', () => {
    const meta = documentMeta({ ogImageUrl: `${SITE_URL}/og-image.png` });
    expect(meta).toContain(`<link rel="canonical" href="${CANONICAL_URL}"/>`);
    expect(meta).toContain(PAGE_DESCRIPTION);
    expect(meta).toContain('application/ld+json');

    const graph = jsonLdGraph();
    expect(graph['@graph'].map((node) => node['@type'])).toEqual([
      'WebSite',
      'WebApplication',
    ]);
    expect(graph['@graph'][1].applicationCategory).toBe('GameApplication');
    expect(graph['@graph'][1].offers).toEqual({
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    });
    expect(graph['@graph'][0].sameAs).toEqual(SAME_AS);
    expect(graph['@graph'][0].url).toBe(CANONICAL_URL);
  });

  it('allows the whole site and points robots at the sitemap', () => {
    const robots = robotsTxt();
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).not.toContain('Disallow:');
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });

  it('lists only the apex homepage in the sitemap', () => {
    const sitemap = sitemapXml();
    expect(sitemap).toContain(`<loc>${CANONICAL_URL}</loc>`);
    expect(sitemap).not.toContain('www.wordkrush.com');
    expect(sitemap.match(/<loc>/g)).toHaveLength(1);
  });

  it('uses the same hub names and taglines a player sees', () => {
    const landing = landingHtml();
    expect(landing).toContain(HUB_SUBTITLE);
    for (const game of GAMES) {
      expect(landing).toContain(game.name);
      expect(landing).toContain(game.tagline);
    }
  });

  it('replaces Expo’s JS-only noscript and seeds #root for HTML crawlers', () => {
    const html = applySearchSurface(FIXTURE, {
      ogImageUrl: `${SITE_URL}/og-image.png`,
    });
    expect(html).toContain(`<title>${PAGE_TITLE}</title>`);
    expect(html).not.toContain('You need to enable JavaScript to run this app.');
    expect(html).toContain('<noscript>');
    expect(html).toContain(`<div id="root">${COPY_MARKERS[0]}<main id="wk-seo">`);
    expect(html).toContain('More or Less');
    expect(html).toContain('Clueless');
    expect(html).toContain('Wordfall');
  });

  it('delimits everything that describes the hub, so a share page can swap it', () => {
    const html = applySearchSurface(FIXTURE, { ogImageUrl: `${SITE_URL}/og-image.png` });
    const [headStart, headEnd] = HEAD_MARKERS;
    const [copyStart, copyEnd] = COPY_MARKERS;

    // `server/share-document.mjs` replaces these blocks whole. Anything the
    // hub says that falls outside them survives onto every share page.
    expect(html).toContain(`${headStart}<title>`);
    expect(html).toContain(`</script>${headEnd}`);
    expect(html.match(new RegExp(copyStart, 'g'))).toHaveLength(2);
    expect(html.match(new RegExp(copyEnd, 'g'))).toHaveLength(2);
    expect(html.slice(html.indexOf(headStart), html.indexOf(headEnd))).toContain(
      PAGE_DESCRIPTION,
    );
  });

  it('anchors the layout CSS after the head block, not inside it', () => {
    const html = applyViewportCss(
      applySearchSurface(FIXTURE, { ogImageUrl: `${SITE_URL}/og-image.png` }),
    );

    expect(html).toContain(`${HEAD_MARKERS[1]}<style id="wk-web-viewport"`);
    expect(applyViewportCss(html)).toBe(html);
  });

  it('injects a Search Console meta tag only when the token is plausible', () => {
    expect(googleVerificationMeta('')).toBe('');
    expect(googleVerificationMeta('abcDEF12-token_99')).toBe(
      '<meta name="google-site-verification" content="abcDEF12-token_99"/>',
    );
    expect(() => googleVerificationMeta('no')).toThrow(/plausible/);
  });

  it('keeps the Search Console HTML file at the Google-required path and body', () => {
    expect(GOOGLE_VERIFICATION_FILE).toBe('googled8072618779c67b2.html');
    expect(GOOGLE_VERIFICATION_BODY).toBe(
      'google-site-verification: googled8072618779c67b2.html',
    );
    const asset = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', GOOGLE_VERIFICATION_FILE),
      'utf8',
    );
    expect(asset).toBe(GOOGLE_VERIFICATION_BODY);
    expect(sitemapXml()).not.toContain(GOOGLE_VERIFICATION_FILE);
  });
});
