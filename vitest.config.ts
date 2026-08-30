import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // The Reddit app's server routes are tested from here, so the Devvit
      // runtime is swapped for an in-memory stand-in. Without this, `npm test`
      // would need `reddit/node_modules` installed — which CI does not do.
      // Nothing else in the repo imports this specifier.
      '@devvit/web/server': new URL(
        './reddit/src/server/testing/devvit-fake.ts',
        import.meta.url,
      ).pathname,
      // `hono` is not aliased — the route tests exercise the real router, so
      // faking it would test nothing. It is a root devDependency instead,
      // pinned to the exact version `reddit/package.json` ships, so the tests
      // run against the router the Reddit app actually uses. That is the only
      // reason a package the Expo app never imports appears in this
      // package.json; CI installs the root tree only (see D-042).
    },
  },
  test: {
    environment: 'node',
    // Node-environment suites only — no DOM rendering. UI files are included
    // for their pure helpers (easing, formatting); component rendering is
    // covered by the browser, not here.
    include: [
      'src/data/**/*.test.ts',
      'src/ui/**/*.test.ts',
      'src/scores/**/*.test.ts',
      'src/settings/**/*.test.ts',
      'src/native/**/*.test.ts',
      // `src/streak/types.test.ts` predates this line and was never collected —
      // the suite existed but had not run since it was written.
      'src/streak/**/*.test.ts',
      'src/auth/**/*.test.ts',
      // `src/teams/**` was missing here, so the team suites never ran despite
      // existing — same gap `src/streak` had above.
      'src/teams/**/*.test.ts',
      'src/analytics/**/*.test.ts',
      'src/feedback/**/*.test.ts',
      'src/games/**/*.test.ts',
      'pipeline/**/*.test.ts',
      'scripts/**/*.test.mjs',
      // The Reddit app is its own npm project, but its pure layer wraps this
      // repo's engine and data. Running it here keeps `npm test` the single
      // answer to "did I break More or Less?" on either surface.
      'reddit/src/shared/**/*.test.ts',
      'reddit/src/server/**/*.test.ts',
    ],
  },
});
