import { describe, expect, it } from 'vitest';

import {
  isVersionOnlyManifestChange,
  requiredDocumentsFor,
} from './check-docs.mjs';

function requiredFor(paths, options) {
  return requiredDocumentsFor(paths, options).map(({ document }) => document);
}

describe('documentation impact rules', () => {
  it('requires a changelog for runtime behavior', () => {
    expect(requiredFor(['src/games/more-or-less/engine.ts'])).toEqual([
      'docs/CHANGELOG.md',
    ]);
  });

  it('does not require product documentation for test-only changes', () => {
    expect(requiredFor(['src/games/more-or-less/engine.test.ts'])).toEqual([]);
  });

  it('requires system documentation for pipeline behavior', () => {
    expect(requiredFor(['pipeline/ingest.ts'])).toEqual([
      'docs/CHANGELOG.md',
      'docs/HOW-IT-WORKS.md',
    ]);
  });

  it('requires all relevant documents for dependency changes', () => {
    expect(requiredFor(['package.json'])).toEqual([
      'docs/CHANGELOG.md',
      'docs/HOW-IT-WORKS.md',
      'docs/STACK.md',
    ]);
  });

  it('requires workflow documentation for agent policy', () => {
    expect(requiredFor(['agents.md'])).toEqual(['docs/WORKFLOW.md']);
  });

  it('requires system and stack docs for a scheduled GitHub Actions workflow', () => {
    expect(requiredFor(['.github/workflows/wikipedia-popularity-weekly.yml'])).toEqual([
      'docs/HOW-IT-WORKS.md',
      'docs/STACK.md',
    ]);
  });

  it('requires system documentation for the Reddit app’s server', () => {
    expect(requiredFor(['reddit/src/server/routes/api.ts'])).toEqual([
      'docs/CHANGELOG.md',
      'docs/HOW-IT-WORKS.md',
    ]);
  });

  it('treats the Reddit app’s client as player-facing behavior only', () => {
    expect(requiredFor(['reddit/src/client/game.tsx'])).toEqual(['docs/CHANGELOG.md']);
  });

  it('requires stack documentation for the Reddit app’s Devvit config', () => {
    expect(requiredFor(['reddit/devvit.json'])).toEqual([
      'docs/CHANGELOG.md',
      'docs/HOW-IT-WORKS.md',
      'docs/STACK.md',
    ]);
  });

  it('accepts the required document in the same change', () => {
    expect(
      requiredFor(['pipeline/ingest.ts', 'docs/CHANGELOG.md', 'docs/HOW-IT-WORKS.md']),
    ).toEqual([]);
  });

  it('treats a D-041 version-only bump as changelog, not stack', () => {
    expect(
      requiredFor(
        [
          'src/data/categories/wikipedia-popularity.json',
          'docs/CHANGELOG.md',
          'package.json',
          'app.json',
        ],
        { versionOnlyManifests: ['package.json', 'app.json'] },
      ),
    ).toEqual([]);
  });

  it('still requires stack docs when package.json changes more than the version', () => {
    expect(
      requiredFor(['package.json'], { versionOnlyManifests: [] }),
    ).toEqual(['docs/CHANGELOG.md', 'docs/HOW-IT-WORKS.md', 'docs/STACK.md']);
  });
});

describe('isVersionOnlyManifestChange', () => {
  it('accepts a package.json version field bump', () => {
    expect(
      isVersionOnlyManifestChange(
        'package.json',
        '{"name":"wordkrush","version":"0.8.0"}\n',
        '{"name":"wordkrush","version":"0.8.1"}\n',
      ),
    ).toBe(true);
  });

  it('accepts an app.json expo.version bump', () => {
    expect(
      isVersionOnlyManifestChange(
        'app.json',
        '{"expo":{"name":"WordKrush","version":"0.8.0"}}\n',
        '{"expo":{"name":"WordKrush","version":"0.8.1"}}\n',
      ),
    ).toBe(true);
  });

  it('rejects a dependency or config edit', () => {
    expect(
      isVersionOnlyManifestChange(
        'package.json',
        '{"version":"0.8.0","dependencies":{}}\n',
        '{"version":"0.8.1","dependencies":{"expo":"57.0.13"}}\n',
      ),
    ).toBe(false);
  });
});
