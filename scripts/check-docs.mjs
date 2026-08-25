#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const VERSION_MANIFESTS = ['package.json', 'app.json'];

const DOCUMENT_RULES = [
  {
    document: 'docs/CHANGELOG.md',
    reason: 'behavior, runtime, data, or configuration changed',
    matches: (path) =>
      /^(App\.tsx|index\.ts|src\/|pipeline\/|validator\/|server\/|supabase\/|config\/|reddit\/)/.test(
        path,
      ) ||
      /^(app\.json|eas\.json|railway\.json|package(?:-lock)?\.json)$/.test(path),
    excludes: (path) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path),
  },
  {
    document: 'docs/HOW-IT-WORKS.md',
    reason: 'system, pipeline, infrastructure, or workflow implementation changed',
    ignoreVersionOnlyManifests: true,
    matches: (path) =>
      /^(\.cursor\/hooks\/|\.github\/|pipeline\/|validator\/|server\/|supabase\/|scripts\/)/.test(
        path,
      ) ||
      // The Reddit app's server, scheduled post and shared-engine boundary are
      // all built-system behaviour; its client is not.
      /^reddit\/(src\/(server|shared)\/|devvit\.json$)/.test(path) ||
      /^(app\.json|eas\.json|railway\.json|package(?:-lock)?\.json)$/.test(path),
  },
  {
    document: 'docs/STACK.md',
    reason: 'stack, build, dependency, deployment, or CI configuration changed',
    ignoreVersionOnlyManifests: true,
    matches: (path) =>
      /^\.github\//.test(path) ||
      // The Reddit app pins its own toolchain and Devvit config; those are
      // stack decisions in the same way the Expo app's manifests are.
      /^reddit\/(package(?:-lock)?\.json|devvit\.json|vite\.config\.ts|tsconfig\.json|tools\/)/.test(
        path,
      ) ||
      /^(app\.json|eas\.json|railway\.json|package(?:-lock)?\.json|tsconfig\.json|vitest\.config\.ts)$/.test(
        path,
      ),
  },
  {
    document: 'docs/WORKFLOW.md',
    reason: 'agent, CI, hook, or repository-process tooling changed',
    matches: (path) =>
      /^(agents\.md|\.cursor\/|\.github\/|scripts\/check-docs(?:\.test)?\.mjs)$/.test(
        path,
      ),
  },
];

function lines(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function jsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function withoutDeclaredVersion(path, value) {
  const clone = structuredClone(value);
  if (path === 'package.json' && clone && typeof clone === 'object') {
    delete clone.version;
    return clone;
  }
  if (path === 'app.json' && clone?.expo && typeof clone.expo === 'object') {
    delete clone.expo.version;
    return clone;
  }
  return clone;
}

export function isVersionOnlyManifestChange(path, beforeText, afterText) {
  if (!VERSION_MANIFESTS.includes(path)) return false;
  let before;
  let after;
  try {
    before = JSON.parse(beforeText);
    after = JSON.parse(afterText);
  } catch {
    return false;
  }
  if (!jsonEqual(withoutDeclaredVersion(path, before), withoutDeclaredVersion(path, after))) {
    return false;
  }
  if (path === 'package.json') {
    return (
      typeof before.version === 'string' &&
      typeof after.version === 'string' &&
      before.version !== after.version
    );
  }
  return (
    typeof before?.expo?.version === 'string' &&
    typeof after?.expo?.version === 'string' &&
    before.expo.version !== after.expo.version
  );
}

export function detectVersionOnlyManifests(changedFiles, readBefore, readAfter) {
  return VERSION_MANIFESTS.filter((path) => {
    if (!changedFiles.includes(path)) return false;
    const before = readBefore(path);
    const after = readAfter(path);
    return (
      typeof before === 'string' &&
      typeof after === 'string' &&
      isVersionOnlyManifestChange(path, before, after)
    );
  });
}

function gitShow(ref, path) {
  try {
    return git(['show', `${ref}:${path}`]);
  } catch {
    return null;
  }
}

export function workingTreeReaders() {
  return {
    readBefore: (path) => gitShow('HEAD', path),
    readAfter: (path) => {
      try {
        return readFileSync(path, 'utf8');
      } catch {
        return null;
      }
    },
  };
}

export function gitRangeReaders(fromRef, toRef) {
  return {
    readBefore: (path) => gitShow(fromRef, path),
    readAfter: (path) => gitShow(toRef, path),
  };
}

export function requiredDocumentsFor(changedFiles, options = {}) {
  const paths = new Set(changedFiles);
  const versionOnly = new Set(options.versionOnlyManifests ?? []);
  const required = [];

  for (const rule of DOCUMENT_RULES) {
    const triggered = changedFiles.some((path) => {
      if (!rule.matches(path) || rule.excludes?.(path)) return false;
      if (rule.ignoreVersionOnlyManifests && versionOnly.has(path)) return false;
      return true;
    });

    if (triggered && !paths.has(rule.document)) {
      required.push({ document: rule.document, reason: rule.reason });
    }
  }

  return required;
}

export function documentationImpact(changedFiles, readers = workingTreeReaders()) {
  return requiredDocumentsFor(changedFiles, {
    versionOnlyManifests: detectVersionOnlyManifests(
      changedFiles,
      readers.readBefore,
      readers.readAfter,
    ),
  });
}

export function localChangedFiles() {
  const tracked = lines(git(['diff', '--name-only', 'HEAD', '--']));
  const untracked = lines(
    git(['ls-files', '--others', '--exclude-standard']),
  );
  return [...new Set([...tracked, ...untracked])];
}

function changedFilesFromCli(args) {
  const filesIndex = args.indexOf('--files');
  if (filesIndex !== -1) {
    return args.slice(filesIndex + 1);
  }

  const baseIndex = args.indexOf('--base');
  if (baseIndex !== -1) {
    const base = args[baseIndex + 1];
    if (!base) {
      throw new Error('--base requires a Git reference');
    }
    return lines(git(['diff', '--name-only', `${base}...HEAD`, '--']));
  }

  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    if (!process.env.GITHUB_BASE_REF) {
      throw new Error('GITHUB_BASE_REF is required for pull-request checks');
    }
    return lines(
      git([
        'diff',
        '--name-only',
        `origin/${process.env.GITHUB_BASE_REF}...HEAD`,
        '--',
      ]),
    );
  }

  if (process.env.GITHUB_EVENT_NAME === 'push') {
    return lines(git(['diff', '--name-only', 'HEAD^', 'HEAD', '--']));
  }

  return localChangedFiles();
}

function readersFromCli(args) {
  const filesIndex = args.indexOf('--files');
  if (filesIndex !== -1) {
    return workingTreeReaders();
  }

  const baseIndex = args.indexOf('--base');
  if (baseIndex !== -1) {
    return gitRangeReaders(args[baseIndex + 1], 'HEAD');
  }

  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    return gitRangeReaders(`origin/${process.env.GITHUB_BASE_REF}`, 'HEAD');
  }

  if (process.env.GITHUB_EVENT_NAME === 'push') {
    return gitRangeReaders('HEAD^', 'HEAD');
  }

  return workingTreeReaders();
}

function messageFor(missing) {
  return [
    'Documentation impact check failed:',
    ...missing.map(
      ({ document, reason }) => `- Update ${document}: ${reason}.`,
    ),
    'Update the affected document with the change; do not add a placeholder.',
  ].join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const changedFiles = changedFilesFromCli(args);
  const missing = documentationImpact(changedFiles, readersFromCli(args));

  if (args.includes('--hook')) {
    const output =
      missing.length === 0
        ? {}
        : { followup_message: messageFor(missing) };
    process.stdout.write(`${JSON.stringify(output)}\n`);
    return;
  }

  if (missing.length > 0) {
    console.error(messageFor(missing));
    process.exitCode = 1;
    return;
  }

  console.log(
    changedFiles.length === 0
      ? 'Documentation impact check: no changed files.'
      : 'Documentation impact check passed.',
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error(
      `Documentation impact check could not run: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exitCode = 1;
  }
}
