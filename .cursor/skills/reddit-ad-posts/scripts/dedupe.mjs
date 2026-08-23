#!/usr/bin/env node
/**
 * Fail a proposed Reddit post if it collides with the ledger in title, hook,
 * first sentence, body, or near-duplicate token/shingle overlap.
 *
 * Usage:
 *   node scripts/dedupe.mjs --ledger ledger.json --sub WordGames --title "..." --body "..."
 *   node scripts/dedupe.mjs --seed --title "..." --body "..."
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const STOP = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'to',
  'of',
  'in',
  'on',
  'it',
  'is',
  'you',
  'your',
  'i',
  'we',
  'for',
  'with',
  'that',
  'this',
  'just',
  'not',
]);

const JACCARD_BLOCK = 0.28;
const SHINGLE_BLOCK = 0.18;
const SUB_COOLDOWN_MS = 21 * 24 * 60 * 60 * 1000;

export function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function firstSentence(text) {
  const trimmed = String(text ?? '').trim();
  const match = trimmed.match(/^[^.!?\n]+[.!?]?/);
  return normalize(match?.[0] ?? trimmed.split('\n')[0] ?? '');
}

export function fingerprint(text) {
  return createHash('sha256').update(normalize(text)).digest('hex');
}

export function tokens(text) {
  return normalize(text)
    .split(' ')
    .filter((word) => word.length > 2 && !STOP.has(word));
}

export function shingles(text, size = 5) {
  const words = tokens(text);
  const out = new Set();
  if (words.length < size) {
    if (words.length > 0) out.add(words.join(' '));
    return out;
  }
  for (let i = 0; i <= words.length - size; i += 1) {
    out.add(words.slice(i, i + size).join(' '));
  }
  return out;
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const item of a) {
    if (b.has(item)) inter += 1;
  }
  return inter / (a.size + b.size - inter);
}

export function collisionReasons(proposed, entries, now = Date.now()) {
  const reasons = [];
  const titleFp = fingerprint(proposed.title);
  const bodyFp = fingerprint(proposed.body);
  const first = firstSentence(proposed.body);
  const titleTokens = new Set(tokens(proposed.title));
  const bodyTokens = new Set(tokens(`${proposed.title} ${proposed.body}`));
  const bodyShingles = shingles(`${proposed.title}\n${proposed.body}`);
  const hook = normalize(proposed.hook ?? '');

  for (const entry of entries) {
    const label = `${entry.status ?? 'unknown'} r/${entry.subreddit} "${entry.title}"`;
    if (entry.titleFingerprint === titleFp || fingerprint(entry.title) === titleFp) {
      reasons.push(`title already used: ${label}`);
    }
    if (entry.bodyFingerprint === bodyFp || fingerprint(entry.body) === bodyFp) {
      reasons.push(`body already used: ${label}`);
    }
    if (entry.firstSentence && entry.firstSentence === first) {
      reasons.push(`first sentence already used: ${label}`);
    }
    if (hook && entry.hook && normalize(entry.hook) === hook) {
      reasons.push(`hook line already used: ${label}`);
    }
    if (
      entry.subreddit?.toLowerCase() === proposed.subreddit.toLowerCase() &&
      entry.status === 'posted' &&
      entry.postedAt
    ) {
      const age = now - Date.parse(entry.postedAt);
      if (Number.isFinite(age) && age < SUB_COOLDOWN_MS) {
        reasons.push(`r/${proposed.subreddit} still in 21-day cooldown (${label})`);
      }
    }
    const priorTokens = new Set(
      tokens(`${entry.title ?? ''} ${entry.body ?? ''}`),
    );
    const tokenScore = jaccard(bodyTokens, priorTokens);
    if (tokenScore >= JACCARD_BLOCK) {
      reasons.push(
        `token overlap ${tokenScore.toFixed(2)} with ${label} (block ≥ ${JACCARD_BLOCK})`,
      );
    }
    const titleScore = jaccard(titleTokens, new Set(tokens(entry.title ?? '')));
    if (titleScore >= 0.55 && titleTokens.size >= 3) {
      reasons.push(`title too close to ${label}`);
    }
    const priorShingles = shingles(`${entry.title ?? ''}\n${entry.body ?? ''}`);
    const shingleScore = jaccard(bodyShingles, priorShingles);
    if (shingleScore >= SHINGLE_BLOCK) {
      reasons.push(
        `shingle overlap ${shingleScore.toFixed(2)} with ${label} (block ≥ ${SHINGLE_BLOCK})`,
      );
    }
  }

  return [...new Set(reasons)];
}

function arg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) return undefined;
  return process.argv[index + 1];
}

function loadLedger(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  return Array.isArray(raw.entries) ? raw.entries : [];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const seed = process.argv.includes('--seed');
  const title = arg('--title') ?? '';
  const body = arg('--body') ?? '';
  if (seed) {
    process.stdout.write(
      `${JSON.stringify(
        {
          titleFingerprint: fingerprint(title),
          bodyFingerprint: fingerprint(body),
          firstSentence: firstSentence(body),
        },
        null,
        2,
      )}\n`,
    );
    process.exit(0);
  }

  const ledgerPath = resolve(arg('--ledger') ?? 'ledger.json');
  const subreddit = arg('--sub') ?? '';
  if (!subreddit || !title || !body) {
    console.error('Need --sub, --title, and --body');
    process.exit(2);
  }
  const reasons = collisionReasons(
    { subreddit, title, body, hook: arg('--hook') },
    loadLedger(ledgerPath),
  );
  if (reasons.length > 0) {
    console.error('DUPLICATE');
    for (const reason of reasons) console.error(`- ${reason}`);
    process.exit(1);
  }
  console.log('OK');
}
