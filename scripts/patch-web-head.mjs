/**
 * Expo's web export only emits `<link rel="icon" href="/favicon.ico">` and no
 * Open Graph tags at all. Chrome caches the favicon path aggressively
 * (wordKrush.com previously showed the Vercel mark), and link previews (iMessage,
 * Slack, Instagram DMs, ...) had nothing to render but a generic globe icon. This
 * copies the WordKrush PNGs into dist/ and points the HTML at cache-busted URLs
 * so the tab icon and share-link preview both show the real brand art.
 *
 * It also emits the branded-search surface (D-061): a crawler-readable title,
 * canonical, JSON-LD, hub copy in `#root` / `<noscript>`, plus robots.txt and
 * sitemap.xml. The playable SPA still mounts at `/`.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE_URL = 'https://wordkrush.com';
export const CANONICAL_URL = `${SITE_URL}/`;
export const PAGE_TITLE =
  'WordKrush — free word games (More or Less, Clueless, Wordfall)';
export const PAGE_DESCRIPTION =
  'Three quick word games — More or Less, Clueless, and Wordfall — with a daily streak to keep. Play free in the browser.';
export const HUB_SUBTITLE = 'Pick a challenge. Keep your mind moving.';
export const SAME_AS = ['https://x.com/WordKrushGame'];

/** Search Console HTML-file verification. Public; must be served at this exact path. */
export const GOOGLE_VERIFICATION_FILE = 'googled8072618779c67b2.html';
export const GOOGLE_VERIFICATION_BODY =
  'google-site-verification: googled8072618779c67b2.html';

/** Hub card lines — keep in lockstep with `src/games/registry.ts`. */
export const GAMES = [
  {
    name: 'More or Less',
    tagline: 'Which one is bigger? Trust your instinct and build a streak.',
  },
  {
    name: 'Clueless',
    tagline: 'Follow the meaning trail to uncover today’s secret word.',
  },
  {
    name: 'Wordfall',
    tagline: 'New levels every Monday. Trace words and set off cascades.',
  },
];

export function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function robotsTxt() {
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join(
    '\n',
  );
}

export function sitemapXml() {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${CANONICAL_URL}</loc>`,
    '  </url>',
    '</urlset>',
    '',
  ].join('\n');
}

export function jsonLdGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'WordKrush',
        url: CANONICAL_URL,
        description: PAGE_DESCRIPTION,
        sameAs: SAME_AS,
      },
      {
        '@type': 'WebApplication',
        name: 'WordKrush',
        url: CANONICAL_URL,
        description: PAGE_DESCRIPTION,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Any',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    ],
  };
}

export function landingHtml() {
  const games = GAMES.map(
    (game) =>
      `<li><h3>${escapeHtml(game.name)}</h3><p>${escapeHtml(game.tagline)}</p></li>`,
  ).join('');
  return [
    '<main id="wk-seo">',
    '<h1>WordKrush</h1>',
    `<p>${escapeHtml(HUB_SUBTITLE)}</p>`,
    `<p>${escapeHtml(PAGE_DESCRIPTION)}</p>`,
    '<h2>Choose your game</h2>',
    `<ul>${games}</ul>`,
    '</main>',
  ].join('');
}

export function googleVerificationMeta(token) {
  const value = token?.trim() ?? '';
  if (!value) return '';
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(value)) {
    throw new Error('GOOGLE_SITE_VERIFICATION is not a plausible Search Console token');
  }
  return `<meta name="google-site-verification" content="${value}"/>`;
}

export function documentMeta({ ogImageUrl, googleSiteVerification } = {}) {
  const verification = googleVerificationMeta(googleSiteVerification);
  return [
    `<title>${escapeHtml(PAGE_TITLE)}</title>`,
    `<meta name="description" content="${escapeHtml(PAGE_DESCRIPTION)}"/>`,
    `<link rel="canonical" href="${CANONICAL_URL}"/>`,
    verification,
    `<meta property="og:type" content="website"/>`,
    `<meta property="og:site_name" content="WordKrush"/>`,
    `<meta property="og:title" content="${escapeHtml(PAGE_TITLE)}"/>`,
    `<meta property="og:description" content="${escapeHtml(PAGE_DESCRIPTION)}"/>`,
    `<meta property="og:url" content="${SITE_URL}"/>`,
    ogImageUrl ? `<meta property="og:image" content="${ogImageUrl}"/>` : '',
    `<meta property="og:image:width" content="1024"/>`,
    `<meta property="og:image:height" content="1024"/>`,
    `<meta name="twitter:card" content="summary_large_image"/>`,
    `<meta name="twitter:title" content="${escapeHtml(PAGE_TITLE)}"/>`,
    `<meta name="twitter:description" content="${escapeHtml(PAGE_DESCRIPTION)}"/>`,
    ogImageUrl ? `<meta name="twitter:image" content="${ogImageUrl}"/>` : '',
    `<script type="application/ld+json">${JSON.stringify(jsonLdGraph())}</script>`,
  ]
    .filter(Boolean)
    .join('');
}

export function applySearchSurface(html, { ogImageUrl, googleSiteVerification } = {}) {
  if (!html.includes('</title>')) {
    throw new Error('HTML has no <title> to replace');
  }

  const meta = documentMeta({ ogImageUrl, googleSiteVerification });
  html = html.replace(/<title>[^<]*<\/title>/, meta);

  const landing = landingHtml();
  const noscript = `<noscript>${landing}<p>WordKrush needs JavaScript to play.</p></noscript>`;
  if (/<noscript>[\s\S]*?<\/noscript>/.test(html)) {
    html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, noscript);
  } else if (html.includes('<body>')) {
    html = html.replace('<body>', `<body>${noscript}`);
  } else {
    throw new Error('HTML has no <body> or <noscript> to attach crawlable copy');
  }

  if (/<div id="root">\s*<\/div>/.test(html)) {
    html = html.replace(/<div id="root">\s*<\/div>/, `<div id="root">${landing}</div>`);
  }

  return html;
}

const viewportCss =
  '<style id="wk-web-viewport">html,body{height:100%;height:100dvh;margin:0;background-color:#0A0817;overflow:hidden}body>div{height:100%}#wk-seo{color:#F4F0FF;padding:24px;font-family:system-ui,sans-serif}#wk-mascot canvas,#wk-mascot svg{max-width:100%!important;max-height:100%!important}#wk-wordfall-board,#wk-wordfall-board *{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}#wk-wordfall-board{touch-action:none!important}</style>';

function patchDist() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const dist = join(root, 'dist');
  const htmlPath = join(dist, 'index.html');

  const faviconPng = readFileSync(join(root, 'assets/favicon.png'));
  const stamp = createHash('sha1').update(faviconPng).digest('hex').slice(0, 10);

  copyFileSync(join(root, 'assets/favicon.png'), join(dist, 'favicon.png'));
  copyFileSync(
    join(root, 'assets/apple-touch-icon.png'),
    join(dist, 'apple-touch-icon.png'),
  );

  const links = [
    `<link rel="icon" type="image/png" sizes="192x192" href="/favicon.png?v=${stamp}"/>`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=${stamp}"/>`,
    `<link rel="icon" href="/favicon.ico?v=${stamp}"/>`,
  ].join('');

  // og:image must be the full lockup, not the favicon crop — link previews render
  // it large, and the favicon's tight W crop reads as a random tile at that size.
  const ogImagePng = readFileSync(join(root, 'assets/logo/wordkrush-lockup.png'));
  const ogStamp = createHash('sha1').update(ogImagePng).digest('hex').slice(0, 10);
  copyFileSync(join(root, 'assets/logo/wordkrush-lockup.png'), join(dist, 'og-image.png'));
  const ogImageUrl = `${SITE_URL}/og-image.png?v=${ogStamp}`;

  const emailDir = join(dist, 'email');
  mkdirSync(emailDir, { recursive: true });
  copyFileSync(join(root, 'assets/email/hub.png'), join(emailDir, 'hub.png'));
  for (const game of ['more-or-less', 'clueless', 'wordfall']) {
    copyFileSync(join(root, `assets/games/${game}.png`), join(emailDir, `${game}.png`));
  }

  let html = readFileSync(htmlPath, 'utf8');
  if (!html.includes('rel="icon"')) {
    throw new Error(`${htmlPath} has no favicon link to replace`);
  }
  html = html.replace(/<link rel="icon"[^>]*>/, links);
  html = applySearchSurface(html, {
    ogImageUrl,
    googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION,
  });
  // Keep in sync with `WEB_VIEWPORT_CSS` in `src/ui/webViewport.ts`.
  if (!html.includes('id="wk-web-viewport"')) {
    html = html.replace('</title>', `</title>${viewportCss}`);
    if (!html.includes('id="wk-web-viewport"')) {
      html = html.replace('</head>', `${viewportCss}</head>`);
    }
  }

  writeFileSync(htmlPath, html);
  writeFileSync(join(dist, 'robots.txt'), robotsTxt());
  writeFileSync(join(dist, 'sitemap.xml'), sitemapXml());
  const verificationSrc = join(root, 'assets', GOOGLE_VERIFICATION_FILE);
  const verificationBody = readFileSync(verificationSrc, 'utf8');
  if (verificationBody !== GOOGLE_VERIFICATION_BODY) {
    throw new Error(`${verificationSrc} does not match the Search Console file body`);
  }
  copyFileSync(verificationSrc, join(dist, GOOGLE_VERIFICATION_FILE));
  console.log(
    `web icons -> dist/ (v=${stamp}), og:image -> dist/ (v=${ogStamp}), search surface -> robots.txt + sitemap.xml + /${GOOGLE_VERIFICATION_FILE}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  patchDist();
}
