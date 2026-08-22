#!/usr/bin/env node

/**
 * Pull the Keep-a-Changelog section for one version so GitHub Releases
 * can publish the same notes humans already wrote. No network, no extra
 * dependency. Missing headings fail closed so we never ship an empty release.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = /^\d+\.\d+\.\d+$/;
const HEADING = /^## \[([^\]]+)\](?:\s+-\s+.+)?\s*$/;

export function changelogNotes(markdown, version) {
  if (!VERSION.test(version)) {
    throw new Error(`version must be x.y.z, got ${JSON.stringify(version)}`);
  }

  const lines = markdown.split(/\r?\n/);
  let start = -1;
  let end = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const match = HEADING.exec(lines[i]);
    if (!match) continue;
    if (match[1] === version) {
      start = i + 1;
      continue;
    }
    if (start !== -1) {
      end = i;
      break;
    }
  }

  if (start === -1) {
    const error = new Error(`docs/CHANGELOG.md has no ## [${version}] heading`);
    error.code = 'CHANGELOG_SECTION_MISSING';
    throw error;
  }

  const notes = lines.slice(start, end).join('\n').trim();
  if (!notes) {
    const error = new Error(`docs/CHANGELOG.md section [${version}] is empty`);
    error.code = 'CHANGELOG_SECTION_EMPTY';
    throw error;
  }
  return notes;
}

export function packageVersion(packageJson) {
  const version = JSON.parse(packageJson).version;
  if (typeof version !== 'string' || !VERSION.test(version)) {
    throw new Error(`package.json version must be x.y.z, got ${JSON.stringify(version)}`);
  }
  return version;
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const requested = process.argv[2];
  const version =
    requested && requested !== '--from-package'
      ? requested.replace(/^v/, '')
      : packageVersion(readFileSync(join(root, 'package.json'), 'utf8'));
  const markdown = readFileSync(join(root, 'docs/CHANGELOG.md'), 'utf8');
  process.stdout.write(`${changelogNotes(markdown, version)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(error && error.code === 'CHANGELOG_SECTION_MISSING' ? 2 : 1);
  }
}
