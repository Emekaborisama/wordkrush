---
name: wordfall-weekly-gauntlet
description: >-
  Authors Wordfall's weekly hard drop (working title Gauntlet): one unique
  task, featured for seven days, never a repeat of last week. Tests the
  catalog, locally deploys the web export, playtests the picker, and only
  then pushes a GitHub PR. Use when adding a Monday Wordfall level, weekly
  drop, Gauntlet, hard weekly level, or when Job B in WORDFALL-WEEKLY.md runs.
---

# Wordfall weekly Gauntlet

Working title **Gauntlet**. Player-facing copy can change later; the catalog
row is still a dated `LEVELS` entry (D-004, D-027). Product contract:
[docs/WORDFALL-WEEKLY.md](../../../docs/WORDFALL-WEEKLY.md).

Do not push to GitHub until the local loop in **Verify before GitHub** is green.

## What a drop is

- One **hard** level per Monday. Not a tutorial. 1–11 already taught the game.
- **TTL is seven days as this week's featured drop** (`isNewestRelease`).
  After Sunday it stays in the catalog so campaign numbering has no holes.
  It is no longer the featured week. Do not delete last week's row.
- The catalog **is** the tracker. Do not keep a second spreadsheet.
- **New task:** `taskFingerprint` of the new row must not match any existing
  `LEVELS` row, and must not match last week's fingerprint. Fingerprint is
  puzzle vs race plus objective kinds (`letter` includes the letter,
  `length` includes `minLength`). Targets may change; the *question* may not
  be reused.
- **Clock from sentiment**, not by default:
  - Urgent / chase / blaze / panic → race (`timeLimitMs`, `moves: 99`)
  - Precise / surgical / demolition / puzzle → untimed move budget
  - A level is a puzzle **or** a race, never both.
- Do **not** invent a sixth `Objective` kind. Unique means a new combination
  of `words` | `length` | `crates` | `letter` | `score`. A new engine rule is
  out of band — stop and ask.

## Author loop

1. Read `docs/WORDFALL-WEEKLY.md`, `src/data/wordfall/levels.ts`, and the last
   three weekly rows (or 9–11 if none exist).
2. Compute `nextNumber` (last + 1) and `nextMonday` (first dated Monday + 7
   days, or the coming Monday that a build can actually contain — never today
   if today is Monday unless the export is already live).
3. Superthread card → checkout **exact** `suggested_branch_name`. No invented
   `feat/` branch. No card → stop and ask. Never push the drop to `master`.
4. Fingerprint every existing row. Design a task whose fingerprint is new.
5. Append one object to `LEVELS`. Name, required `description`, objectives.
   `availableFrom` is that Monday. Do not copy level 8 with a new date.
6. Changelog `[Unreleased]`: number, Monday, one-line idea.
7. Run **Verify before GitHub**. Only then commit, push, and open the PR.

## Verify before GitHub

Stop on the first red step. Do not `git push` to paper over a local miss.

```bash
npx vitest run src/games/wordfall/schedule.test.ts src/games/wordfall/engine.test.ts
npm run check
npm run build:web
npm run serve:web
```

`serve:web` is the local production deploy (`dist/` on port 8080). It is not
`npm run web` (dev). Leave it running and playtest:

- Hub loads.
- Wordfall start screen loads.
- Picker lists the new row: name, description, **drops {Monday}** (future
  rows are not playable today — that is correct).
- Launch 1–11 still play. Open level 1 and confirm the board is live.
- Do not temporarily undate the new row to play it; the solver test is the
  winnability proof. Restore nothing because you changed nothing.

If the solver cannot win seeds 11 / 4242 / 90210, loosen the target. If it
wins on move one, tighten it. Re-run the whole verify loop.

Then, and only then: commit, `git push`, open PR
`ST-<id> Wordfall level <n> — <Monday>`. Body: number, `availableFrom`,
puzzle vs race, fingerprint, solver seeds that won. Merge stays human.

## Forbidden

- Placeholder objectives to keep the buffer green.
- Repeat last week's fingerprint.
- New special tiles, dictionary rebuild, engine actions.
- Runtime fetch / Supabase level read.
- Push to `master`, auto-merge, EAS, or App Store submit.
