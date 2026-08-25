/**
 * Expo's web export only emits `<link rel="icon" href="/favicon.ico">` and no
 * Open Graph tags at all. Chrome caches the favicon path aggressively
 * (wordKrush.com previously showed the Vercel mark), and link previews (iMessage,
 * Slack, Instagram DMs, ...) had nothing to render but a generic globe icon. This
 * copies the WordKrush PNGs into dist/ and points the HTML at cache-busted URLs
 * so the tab icon and share-link preview both show the real brand art.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_URL = 'https://wordkrush.com';
const OG_DESCRIPTION =
  'Three quick word games — More or Less, Clueless, and Wordfall — with a daily streak to keep.';

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

const meta = [
  `<meta name="description" content="${OG_DESCRIPTION}"/>`,
  `<meta property="og:type" content="website"/>`,
  `<meta property="og:site_name" content="WordKrush"/>`,
  `<meta property="og:title" content="WordKrush"/>`,
  `<meta property="og:description" content="${OG_DESCRIPTION}"/>`,
  `<meta property="og:url" content="${SITE_URL}"/>`,
  `<meta property="og:image" content="${ogImageUrl}"/>`,
  `<meta property="og:image:width" content="1024"/>`,
  `<meta property="og:image:height" content="1024"/>`,
  `<meta name="twitter:card" content="summary_large_image"/>`,
  `<meta name="twitter:title" content="WordKrush"/>`,
  `<meta name="twitter:description" content="${OG_DESCRIPTION}"/>`,
  `<meta name="twitter:image" content="${ogImageUrl}"/>`,
].join('');

let html = readFileSync(htmlPath, 'utf8');
if (!html.includes('rel="icon"')) {
  throw new Error(`${htmlPath} has no favicon link to replace`);
}
if (!html.includes('</title>')) {
  throw new Error(`${htmlPath} has no <title> to anchor Open Graph tags on`);
}
const viewportCss =
  '<style id="wk-web-viewport">html,body{height:100%;height:100dvh;margin:0;background-color:#0A0817;overflow:hidden}body>div{height:100%}#wk-mascot canvas,#wk-mascot svg{max-width:100%!important;max-height:100%!important}</style>';

html = html.replace(/<link rel="icon"[^>]*>/, links);
// Keep in sync with `WEB_VIEWPORT_CSS` in `src/ui/webViewport.ts`.
html = html.replace('</title>', `</title>${meta}${viewportCss}`);
writeFileSync(htmlPath, html);
console.log(`web icons -> dist/ (v=${stamp}), og:image -> dist/ (v=${ogStamp})`);
