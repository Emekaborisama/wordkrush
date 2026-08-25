---
name: wordfall-weekly-gauntlet
description: >-
  Maintains Wordfall's four-week hard-drop buffer (working title Gauntlet) on
  a standing CI-gated PR: each level is unique, featured for seven days,
  and never a repeat. Tests the catalog, locally deploys the web export,
  playtests the picker, and only then updates GitHub. Use when adding a Monday
  Wordfall level, weekly drop, Gauntlet, hard weekly level, or when Job B in
  WORDFALL-WEEKLY.md runs.
---

# Wordfall weekly Gauntlet

Working title **Gauntlet**. Player-facing copy can change later; the catalog
row is still a dated `LEVELS` entry (D-004, D-027). Product contract:
[docs/WORDFALL-WEEKLY.md](../../../docs/WORDFALL-WEEKLY.md).

Do not push to GitHub until the local loop in **Verify before GitHub** is green.
The standing `content/wordfall-weekly` content branch is a documented automation
exception to the normal Superthread card branch contract (D-058).

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
2. Count dated rows whose `availableFrom` is still in the future. If there are
   already four, stop without changing files or GitHub. Otherwise compute each
   missing consecutive Monday, `nextNumber`, and `nextMonday` (the coming
   Monday that a build can actually contain — never today unless the export is
   already live).
3. Use the standing `content/wordfall-weekly` content branch. If its PR is
   open, extend it; otherwise start it from current `master` and create a new
   non-draft PR only after verification. Do not create a Superthread card or a
   per-drop branch. An environment-created `cursor/...` branch is not the
   delivery branch: before any GitHub write, ensure the change is on
   `content/wordfall-weekly`. Never push directly to `master`.
4. Fingerprint every existing and newly planned row. Design one hard task per
   missing Monday, each with a new fingerprint.
5. Append enough objects to `LEVELS` to restore the four-week buffer. Each has
   a name, required `description`, objectives, and its Monday
   `availableFrom`. Do not copy level 8 with a new date.
6. Add one pending `[x.y.z]` changelog section plus matching `package.json` /
   `app.json` bump for the PR. If extending an unmerged PR, update that
   pending section rather than creating a second version heading.
7. Run **Verify before GitHub**. Only then commit, push, and create or update
   the standing CI-gated PR.

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

Then, and only then: commit, `git push` to `content/wordfall-weekly`, and
create or update the **non-draft** PR `Wordfall weekly buffer through <last
Monday>`. Ensure it carries the `automation:auto-merge` label (create that
repository label if it is absent). Its body lists every number and
`availableFrom`, puzzle vs race, fingerprint, solver seeds that won, and the
native-release caveat. The GitHub merge workflow merges only that labelled
branch after successful CI for its exact current head; never merge it manually.

## Forbidden

- Placeholder objectives to keep the buffer green.
- Repeat last week's fingerprint.
- New special tiles, dictionary rebuild, engine actions.
- Runtime fetch / Supabase level read.
- Per-drop Superthread cards or branches for routine buffer refills.
- Push directly to `master`, force-push, use an administrative merge override,
  EAS, or App Store submit.
