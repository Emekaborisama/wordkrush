#!/usr/bin/env node
/**
 * The external uptime check (docs/OBSERVABILITY.md, "Web production"). It
 * proves what Railway's internal health check cannot: public DNS, Cloudflare,
 * TLS, the app shell, the main bundle's cache contract, and the release that
 * is live. A failing check fails the scheduled GitHub run, and GitHub emails
 * the owner.
 *
 * Usage: node scripts/synthetic-check.mjs [origin]   (default https://wordkrush.com)
 */

/** The hashed main bundle the shell loads. */
export function mainBundlePath(html) {
  const match = /\/_expo\/static\/js\/web\/[A-Za-z0-9_.-]+\.js/.exec(html);
  return match ? match[0] : null;
}

/** One request, retried once after a pause, so a single dropped packet is not an outage. */
async function request(fetchImpl, url, init, wait) {
  try {
    return await fetchImpl(url, init);
  } catch {
    await wait();
    return fetchImpl(url, init);
  }
}

/**
 * Runs every check against `origin`. Failures mean players are affected;
 * warnings are worth fixing but are not an outage.
 */
export async function runChecks(origin, fetchImpl = fetch, wait = () => new Promise((r) => setTimeout(r, 5000))) {
  const failures = [];
  const warnings = [];
  const notes = [];
  const fail = (message) => failures.push(message);

  let shell = '';
  try {
    const response = await request(fetchImpl, `${origin}/`, {}, wait);
    shell = await response.text();
    if (response.status !== 200) fail(`/ returned ${response.status}`);
    else if (!(response.headers.get('content-type') ?? '').includes('text/html')) fail('/ is not text/html');
    else if (!shell.includes('id="root"')) fail('/ is missing the app root');
  } catch (error) {
    fail(`/ unreachable: ${error instanceof Error ? error.message : String(error)}`);
  }

  const bundle = mainBundlePath(shell);
  if (shell && !bundle) fail('the shell names no main bundle');
  if (bundle) {
    try {
      const response = await request(fetchImpl, `${origin}${bundle}`, { method: 'HEAD' }, wait);
      if (response.status !== 200) fail(`main bundle returned ${response.status}`);
      else {
        if (!(response.headers.get('content-type') ?? '').includes('javascript')) fail('main bundle is not JavaScript');
        if (!(response.headers.get('cache-control') ?? '').includes('immutable')) warnings.push('main bundle is not immutable');
      }
    } catch (error) {
      fail(`main bundle unreachable: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    const response = await request(fetchImpl, `${origin}/healthz`, {}, wait);
    const body = await response.json().catch(() => null);
    if (response.status !== 200) fail(`/healthz returned ${response.status}`);
    else if (!body || body.ok !== true) fail('/healthz did not report ok (an old release, or the app failed to load)');
    else notes.push(`live release ${body.version}`);
  } catch (error) {
    fail(`/healthz unreachable: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const response = await request(fetchImpl, `${origin}/isabilagos`, {}, wait);
    if (response.status !== 200) fail(`/isabilagos returned ${response.status}`);
  } catch (error) {
    fail(`/isabilagos unreachable: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const www = origin.replace('://', '://www.');
    const response = await request(fetchImpl, `${www}/`, { redirect: 'manual' }, wait);
    const location = response.headers.get('location') ?? '';
    if (![301, 302, 307, 308].includes(response.status) || !location.startsWith(origin)) {
      warnings.push(`www answers ${response.status} instead of redirecting to ${origin}`);
    }
  } catch {
    warnings.push('www is unreachable');
  }

  return { failures, warnings, notes };
}

async function main() {
  const origin = (process.argv[2] ?? 'https://wordkrush.com').replace(/\/$/, '');
  const { failures, warnings, notes } = await runChecks(origin);
  for (const note of notes) console.log(note);
  for (const warning of warnings) console.log(`::warning::${warning}`);
  for (const failure of failures) console.log(`::error::${failure}`);
  if (failures.length > 0) process.exit(1);
  console.log(`${origin} is up`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
