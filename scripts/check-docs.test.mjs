import { describe, expect, it } from 'vitest';

import { requiredDocumentsFor } from './check-docs.mjs';

function requiredFor(paths) {
  return requiredDocumentsFor(paths).map(({ document }) => document);
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
});
