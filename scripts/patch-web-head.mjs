/**
 * Expo's web export only emits `<link rel="icon" href="/favicon.ico">`.
 * Chrome caches that path aggressively (wordKrush.com previously showed the
 * Vercel mark). This copies the PNG icons into dist/ and points the HTML at
 * cache-busted URLs so the WordKrush W is what the tab actually shows.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

let html = readFileSync(htmlPath, 'utf8');
if (!html.includes('rel="icon"')) {
  throw new Error(`${htmlPath} has no favicon link to replace`);
}
html = html.replace(/<link rel="icon"[^>]*>/, links);
writeFileSync(htmlPath, html);
console.log(`web icons -> dist/ (v=${stamp})`);
