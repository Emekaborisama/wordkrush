import { describe, expect, it } from 'vitest';

import { changelogNotes, packageVersion } from './changelog-notes.mjs';

const SAMPLE = `# Changelog

## [Unreleased]

- not this

## [0.1.0] - 2026-08-22

### Added
- First ship.

## [0.0.0] - 2026-08-16

- Repo created.
`;

describe('changelogNotes', () => {
  it('returns the named version body and stops at the next heading', () => {
    expect(changelogNotes(SAMPLE, '0.1.0')).toBe('### Added\n- First ship.');
  });

  it('fails closed when the heading is missing or empty', () => {
    expect(() => changelogNotes(SAMPLE, '9.9.9')).toThrow(/no ## \[9\.9\.9\]/);
    expect(() => changelogNotes('## [1.0.0]\n\n', '1.0.0')).toThrow(/empty/);
  });

  it('rejects a non-semver version', () => {
    expect(() => changelogNotes(SAMPLE, 'v0.1.0')).toThrow(/x\.y\.z/);
  });
});

describe('packageVersion', () => {
  it('reads a strict x.y.z from package.json', () => {
    expect(packageVersion('{"version":"0.1.0"}')).toBe('0.1.0');
  });
});
