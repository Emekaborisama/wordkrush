#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const DOCUMENT_RULES = [
  {
    document: 'docs/CHANGELOG.md',
    reason: 'behavior, runtime, data, or configuration changed',
    matches: (path) =>
      /^(App\.tsx|index\.ts|src\/|pipeline\/|validator\/|server\/|supabase\/|config\/)/.test(
        path,
      ) ||
      /^(app\.json|eas\.json|railway\.json|package(?:-lock)?\.json)$/.test(path),
    excludes: (path) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path),
  },
  {
    document: 'docs/HOW-IT-WORKS.md',
    reason: 'system, pipeline, infrastructure, or workflow implementation changed',
    matches: (path) =>
      /^(\.cursor\/hooks\/|\.github\/|pipeline\/|validator\/|server\/|supabase\/|scripts\/)/.test(
        path,
      ) ||
      /^(app\.json|eas\.json|railway\.json|package(?:-lock)?\.json)$/.test(path),
  },
  {
    document: 'docs/STACK.md',
    reason: 'stack, build, dependency, deployment, or CI configuration changed',
    matches: (path) =>
      /^\.github\//.test(path) ||
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

export function requiredDocumentsFor(changedFiles) {
  const paths = new Set(changedFiles);
  const required = [];

  for (const rule of DOCUMENT_RULES) {
    const triggered = changedFiles.some(
      (path) => rule.matches(path) && !rule.excludes?.(path),
    );

    if (triggered && !paths.has(rule.document)) {
      required.push({ document: rule.document, reason: rule.reason });
    }
  }

  return required;
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
  const missing = requiredDocumentsFor(changedFiles);

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
