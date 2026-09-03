/**
 * Static server for the Expo web export with dynamic share routes.
 *
 * Railway needs a process listening on $PORT; `expo export` produces a folder
 * of files. This is the server that joins the two, with dynamic /share/:id
 * routes for per-result Open Graph previews.
 *
 * Three things make the difference between a fast game and a slow one:
 *
 *   COMPRESSION — the bundle is a single ~3 MB JavaScript file. Served raw over
 *   a phone connection that is several seconds of blank screen. Brotli takes it
 *   under a megabyte, which is the single highest-impact thing this file does.
 *
 *   PRE-WARMING — everything is read and compressed BEFORE the server starts
 *   listening. Compressing on first request would hand the first visitor after
 *   every deploy a multi-second wait, and would let the health check pass while
 *   the server was still effectively cold.
 *
 *   CACHE HEADERS THAT MATCH THE FILENAMES — Expo hashes the bundle name, so it
 *   can be cached forever, but index.html points AT that name and must never be
 *   cached. Getting this backwards is what pins users to a stale build after a
 *   deploy, and it fails silently: everything works, just not the new version.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';
import { generateOgImagePng, generateOgDescription } from './og-image.mjs';
import { preloadCardPhotos } from './og-photos.mjs';
import { hasShareMarkers, shareDocument } from './share-document.mjs';

const brotli = promisify(brotliCompress);
const gzipped = promisify(gzip);

const ROOT = resolve(process.env.STATIC_ROOT ?? 'dist');
const PORT = Number(process.env.PORT ?? 8080);
const HOST = '0.0.0.0';

/**
 * Stamp appended to the generated OG image URL.
 *
 * A scraper caches an unfurled image against its URL, so a rendering fix that
 * changes the bytes behind an unchanged URL stays invisible to everyone who has
 * already unfurled that link — X served the pre-font tofu render for a day.
 * Every PR bumps this version (docs/WORKFLOW.md), so shipping a render fix also
 * moves every share card onto a URL no scraper has seen.
 */
const OG_IMAGE_VERSION = JSON.parse(
  await readFile(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf-8'),
).version;

/**
 * The OG image is rendered per request, so the old 24-hour TTL is what pinned a
 * bad render in scraper caches for a day. Five minutes still absorbs the burst
 * of scrapers that follow one paste, and it keeps the window between deploying a
 * render fix and seeing it short enough to check the same day.
 */
const OG_IMAGE_CACHE_CONTROL = 'public, max-age=300';

/**
 * Rendered cards, keyed by share id.
 *
 * A card is a rasterise plus a palettised PNG encode, and a scraper fetches it
 * once and renders whatever comes back — spending that on every scrape of the
 * same link is latency in the one request that must not be slow. One paste
 * brings a burst of scrapers to a single id, so the first pays and the rest
 * read memory.
 *
 * Bounded because share ids are unbounded: oldest out once full, which is the
 * right eviction order when the traffic is bursts around freshly pasted links.
 */
const ogImageCache = new Map();
const OG_IMAGE_CACHE_MAX = 256;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const COMPRESSIBLE = /^(text\/|application\/(javascript|json|xml)|image\/svg)/;
const MIN_COMPRESS_BYTES = 1024;

const files = new Map();
let indexHtml = null;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function cacheControl(urlPath, type) {
  if (type.startsWith('text/html')) return 'no-cache';
  if (urlPath.startsWith('/_expo/')) return 'public, max-age=31536000, immutable';
  return 'public, max-age=3600';
}

export async function warm() {
  const paths = await walk(ROOT);
  let raw = 0;
  let sent = 0;
  indexHtml = null;

  for (const absolute of paths) {
    const body = await readFile(absolute);
    const urlPath = `/${relative(ROOT, absolute).split(sep).join('/')}`;
    const type = MIME[extname(absolute).toLowerCase()] ?? 'application/octet-stream';
    const record = {
      body,
      type,
      cacheControl: cacheControl(urlPath, type),
      etag: `"${createHash('sha1').update(body).digest('base64url').slice(0, 22)}"`,
      encodings: new Map(),
    };

    if (COMPRESSIBLE.test(type) && body.length >= MIN_COMPRESS_BYTES) {
      const [br, gz] = await Promise.all([
        brotli(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }),
        gzipped(body, { level: 9 }),
      ]);
      if (br.length < body.length) record.encodings.set('br', br);
      if (gz.length < body.length) record.encodings.set('gzip', gz);
    }

    files.set(urlPath, record);
    
    // Save index.html for share routes
    if (urlPath === '/index.html') {
      indexHtml = body.toString('utf-8');
    }

    raw += body.length;
    sent += record.encodings.get('br')?.length ?? body.length;
  }

  // A shell without the delimiters means `scripts/patch-web-head.mjs` and
  // `server/share-document.mjs` have drifted apart. Fail here rather than
  // quietly serving every share page the homepage's description again.
  if (indexHtml !== null && !hasShareMarkers(indexHtml)) {
    throw new Error(
      'index.html is missing the share-document markers — rebuild with `npm run build:web`',
    );
  }

  return { count: paths.length, raw, sent };
}

function lookup(rawUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(rawUrl, 'http://localhost').pathname);
  } catch {
    return null;
  }
  const normalized = posix.normalize(pathname);
  const candidates = normalized.endsWith('/')
    ? [`${normalized}index.html`]
    : [normalized, `${normalized}/index.html`];

  for (const candidate of candidates) {
    const hit = files.get(candidate);
    if (hit) return hit;
  }

  if (!extname(normalized)) return files.get('/index.html') ?? null;
  return null;
}

function chooseEncoding(record, acceptEncoding = '') {
  const accepted = acceptEncoding.toLowerCase();
  for (const candidate of ['br', 'gzip']) {
    if (accepted.includes(candidate) && record.encodings.has(candidate)) {
      return { body: record.encodings.get(candidate), encoding: candidate };
    }
  }
  return { body: record.body, encoding: null };
}

/**
 * Canonical form of a share id taken from a raw request path.
 *
 * `url.pathname` keeps its percent-escapes, and `~` is legal but unreserved,
 * so a client, proxy or crawler that normalises it to `%7E` was asking for a
 * share id this server had never heard of and getting a 404 — for the image as
 * readily as for the page. Decoding first means one id has one meaning
 * whichever spelling arrives, and the tags the page declares use this form.
 */
function canonicalShareId(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Decode share data from URL-safe base64.
 *
 * Padding is restored rather than assumed: `twitter-text`, the library X's own
 * composer uses to find links in a draft, treats `~` as a character a URL may
 * contain but never end with, so roughly half of all share links reach a
 * scraper with their trailing padding — and everything after it — cut off.
 */
function decodeShareData(encoded) {
  try {
    const unpadded = encoded.replace(/-/g, '+').replace(/_/g, '/').replace(/[=~]+$/, '');
    const base64 = unpadded.padEnd(Math.ceil(unpadded.length / 4) * 4, '=');
    const json = Buffer.from(base64, 'base64').toString('utf-8');
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object' || !('game' in data)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Handle /share/:id routes with dynamic OG tags.
 * Returns null for non-share routes, '404' for invalid share IDs, or the HTML record.
 */
function handleShareRoute(pathname) {
  const match = /^\/share\/([^/?]+)/.exec(pathname);
  if (!match) return null;

  const shareId = canonicalShareId(match[1]);
  const shareData = decodeShareData(shareId);
  // Invalid share ID should 404, not fall through to SPA homepage
  if (!shareData || !indexHtml) return '404';

  const html = shareDocument(indexHtml, {
    shareId,
    shareData,
    description: generateOgDescription(shareData),
    imageVersion: OG_IMAGE_VERSION,
  });

  const body = Buffer.from(html, 'utf-8');

  return {
    body,
    type: 'text/html; charset=utf-8',
    cacheControl: 'public, max-age=3600',
    etag: `"${createHash('sha1').update(body).digest('base64url').slice(0, 22)}"`,
    encodings: new Map(),
  };
}

/**
 * Handle /share/:id/og.png routes for OG images.
 * Returns null for non-OG routes, '404' for invalid share IDs, or the PNG record.
 *
 * Matches on the path alone, so the `?v=` cache-bust stamp never has to be a
 * known value — any stamp resolves to the current render of that share id.
 */
async function handleOgImageRoute(pathname) {
  const match = /^\/share\/([^/]+)\/og\.png$/.exec(pathname);
  if (!match) return null;

  const shareId = canonicalShareId(match[1]);
  const shareData = decodeShareData(shareId);
  // Invalid share ID should 404
  if (!shareData) return '404';

  const cached = ogImageCache.get(shareId);
  if (cached) return cached;

  const pngBuffer = await generateOgImagePng(shareData, shareId);

  const record = {
    body: pngBuffer,
    type: 'image/png',
    cacheControl: OG_IMAGE_CACHE_CONTROL,
    etag: `"${createHash('sha1').update(pngBuffer).digest('base64url').slice(0, 22)}"`,
    encodings: new Map(),
    // Nothing about this response varies on the request: it is one PNG, served
    // uncompressed. Claiming otherwise tells every cache between here and the
    // scraper to key on a header that changes nothing.
    vary: null,
  };

  if (ogImageCache.size >= OG_IMAGE_CACHE_MAX) {
    ogImageCache.delete(ogImageCache.keys().next().value);
  }
  ogImageCache.set(shareId, record);

  return record;
}

export async function handleRequest(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' }).end();
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');
  const pathname = url.pathname;

  // Try dynamic routes first
  let record = await handleOgImageRoute(pathname);
  if (!record) record = handleShareRoute(pathname);
  
  // Invalid share ID returns '404' sentinel, not null
  if (record === '404') {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Share not found');
    return;
  }
  
  if (!record) record = lookup(req.url ?? '/');

  if (!record) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }

  if (req.headers['if-none-match'] === record.etag) {
    res.writeHead(304, { etag: record.etag, 'cache-control': record.cacheControl }).end();
    return;
  }

  const { body, encoding } = chooseEncoding(record, req.headers['accept-encoding']);
  const headers = {
    'content-type': record.type,
    'content-length': body.length,
    'cache-control': record.cacheControl,
    etag: record.etag,
    'x-content-type-options': 'nosniff',
  };
  if (record.vary !== null) headers.vary = 'Accept-Encoding';
  if (encoding) headers['content-encoding'] = encoding;

  res.writeHead(200, headers);
  if (req.method === 'HEAD') res.end();
  else res.end(body);
}

async function main() {
  try {
    await stat(ROOT);
  } catch {
    console.error(`No build output at ${ROOT}. Run \`npm run build:web\` first.`);
    process.exit(1);
  }

  const { count, raw, sent } = await warm();
  const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;
  console.log(`prepared ${count} files — ${mb(raw)} raw, ${mb(sent)} over the wire (brotli)`);

  // Card photos are fetched here, not on the request that needs them: a
  // scraper reads a card once and renders whatever came back, so a Wikimedia
  // round trip inside that request is the difference between a card and a
  // blank one. Same reason the bundle is compressed before this port opens.
  // A cold pool still draws the board, so this never blocks the boot.
  const pool = await preloadCardPhotos();
  console.log(`card photos — ${pool.loaded}/${pool.eligible} attribution-free photographs ready`);

  const server = createServer(handleRequest);

  server.listen(PORT, HOST, () => {
    console.log(`serving ${ROOT} on http://${HOST}:${PORT}`);
  });

  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      console.log(`${signal} received, closing`);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 5000).unref();
    });
  }
}

// `node server/serve.mjs` (railway.json, `npm run serve:web`) starts listening;
// importing this module to exercise the share routes must not. Same entrypoint
// guard as `scripts/check-docs.mjs` and `scripts/patch-web-head.mjs`, compared
// through the filesystem so a relative `argv[1]` still matches.
if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')) {
  await main();
}
