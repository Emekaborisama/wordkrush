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
import { generateOgImageSvg } from './og-image.mjs';

const brotli = promisify(brotliCompress);
const gzipped = promisify(gzip);

const ROOT = resolve(process.env.STATIC_ROOT ?? 'dist');
const PORT = Number(process.env.PORT ?? 8080);
const HOST = '0.0.0.0';

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

async function warm() {
  const paths = await walk(ROOT);
  let raw = 0;
  let sent = 0;

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
 * Decode share data from URL-safe base64.
 */
function decodeShareData(encoded) {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/').replace(/~/g, '=');
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
 */
function handleShareRoute(pathname) {
  const match = /^\/share\/([^/?]+)/.exec(pathname);
  if (!match) return null;

  const encoded = match[1];
  const shareData = decodeShareData(encoded);
  if (!shareData || !indexHtml) return null;

  // Generate OG image URL
  const ogImageUrl = `https://wordkrush.com/share/${encoded}/og.svg`;
  const gameTitle = {
    'more-or-less': 'More or Less',
    clueless: 'Clueless',
    wordfall: 'Wordfall',
  }[shareData.game];

  const title = `WordKrush · ${gameTitle}`;
  const description = 'Check out my game result!';

  // Inject OG tags into index.html
  const ogTags = `
    <title>${escapeHtml(title)}</title>
    <meta property="og:type" content="website"/>
    <meta property="og:site_name" content="WordKrush"/>
    <meta property="og:title" content="${escapeHtml(title)}"/>
    <meta property="og:description" content="${escapeHtml(description)}"/>
    <meta property="og:url" content="https://wordkrush.com/share/${encoded}"/>
    <meta property="og:image" content="${ogImageUrl}"/>
    <meta property="og:image:width" content="1200"/>
    <meta property="og:image:height" content="630"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:title" content="${escapeHtml(title)}"/>
    <meta name="twitter:description" content="${escapeHtml(description)}"/>
    <meta name="twitter:image" content="${ogImageUrl}"/>
  `;

  const html = indexHtml.replace(/<title>[^<]*<\/title>/, ogTags);
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
 * Handle /share/:id/og.svg routes for OG images.
 */
function handleOgImageRoute(pathname) {
  const match = /^\/share\/([^/]+)\/og\.svg$/.exec(pathname);
  if (!match) return null;

  const encoded = match[1];
  const shareData = decodeShareData(encoded);
  if (!shareData) return null;

  const svg = generateOgImageSvg(shareData);
  const body = Buffer.from(svg, 'utf-8');

  return {
    body,
    type: 'image/svg+xml',
    cacheControl: 'public, max-age=86400',
    etag: `"${createHash('sha1').update(body).digest('base64url').slice(0, 22)}"`,
    encodings: new Map(),
  };
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return entities[char];
  });
}

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' }).end();
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');
  const pathname = url.pathname;

  // Try dynamic routes first
  let record = handleOgImageRoute(pathname);
  if (!record) record = handleShareRoute(pathname);
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
    vary: 'Accept-Encoding',
    'x-content-type-options': 'nosniff',
  };
  if (encoding) headers['content-encoding'] = encoding;

  res.writeHead(200, headers);
  if (req.method === 'HEAD') res.end();
  else res.end(body);
});

try {
  await stat(ROOT);
} catch {
  console.error(`No build output at ${ROOT}. Run \`npm run build:web\` first.`);
  process.exit(1);
}

const { count, raw, sent } = await warm();
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;
console.log(`prepared ${count} files — ${mb(raw)} raw, ${mb(sent)} over the wire (brotli)`);

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
