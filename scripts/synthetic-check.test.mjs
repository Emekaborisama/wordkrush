import { describe, expect, it } from 'vitest';
import { mainBundlePath, runChecks } from './synthetic-check.mjs';

const BUNDLE = '/_expo/static/js/web/index-0123abcd.js';
const SHELL = `<!doctype html><div id="root"></div><script src="${BUNDLE}" defer></script>`;

function reply(status, { body = '', headers = {} } = {}) {
  return {
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    text: async () => body,
    json: async () => JSON.parse(body),
  };
}

/** A fake fetch that answers from a table, and throws for anything missing. */
function fakeFetch(table) {
  return async (url) => {
    const answer = table[url];
    if (!answer) throw new Error(`unreachable ${url}`);
    return answer;
  };
}

const HEALTHY = {
  'https://wordkrush.com/': reply(200, { body: SHELL, headers: { 'content-type': 'text/html; charset=utf-8' } }),
  [`https://wordkrush.com${BUNDLE}`]: reply(200, {
    headers: { 'content-type': 'text/javascript', 'cache-control': 'public, max-age=31536000, immutable' },
  }),
  'https://wordkrush.com/healthz': reply(200, { body: '{"ok":true,"version":"0.13.0"}' }),
  'https://wordkrush.com/isabilagos': reply(200, { body: SHELL, headers: { 'content-type': 'text/html' } }),
  'https://www.wordkrush.com/': reply(301, { headers: { location: 'https://wordkrush.com/' } }),
};

const noWait = async () => {};

describe('mainBundlePath', () => {
  it('finds the hashed bundle the shell loads', () => {
    expect(mainBundlePath(SHELL)).toBe(BUNDLE);
    expect(mainBundlePath('<html></html>')).toBeNull();
  });
});

describe('runChecks', () => {
  it('passes a healthy site and reports the live release', async () => {
    const result = await runChecks('https://wordkrush.com', fakeFetch(HEALTHY), noWait);
    expect(result).toEqual({ failures: [], warnings: [], notes: ['live release 0.13.0'] });
  });

  it('fails when the health check or the bundle is down', async () => {
    const broken = { ...HEALTHY, 'https://wordkrush.com/healthz': reply(503, { body: '{"ok":false}' }) };
    delete broken[`https://wordkrush.com${BUNDLE}`];
    const result = await runChecks('https://wordkrush.com', fakeFetch(broken), noWait);
    expect(result.failures).toEqual(['main bundle unreachable: unreachable https://wordkrush.com' + BUNDLE, '/healthz returned 503']);
  });

  it('only warns when www does not redirect', async () => {
    const result = await runChecks(
      'https://wordkrush.com',
      fakeFetch({ ...HEALTHY, 'https://www.wordkrush.com/': reply(404) }),
      noWait,
    );
    expect(result.failures).toEqual([]);
    expect(result.warnings).toEqual(['www answers 404 instead of redirecting to https://wordkrush.com']);
  });
});
