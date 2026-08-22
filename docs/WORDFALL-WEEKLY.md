# Wordfall weekly levels

**Last updated:** 2026-08-22
**Status:** Calendar gate is [BUILT]. Authoring is still manual. Scheduled automation is [PLANNED] and should follow this contract rather than invent a live content server.
**Audience:** whoever authors the next drop, or wires the weekly job. Read [STACK.md](STACK.md) D-004 and D-027 first.

This is the operating spec for “a new Wordfall level every Monday.” The catalog in git **is** the schedule. Monday does not fetch anything.

---

## 1. What “release” means

A drop has three clocks. Confusing them is how a week ships empty.

| Clock | What happens | Owner |
|---|---|---|
| **Catalog** | A new row is merged into `src/data/wordfall/levels.ts` with `availableFrom: 'YYYY-MM-DD'` set to that Monday | PR to `master` |
| **Build** | The row is inside the binary the player actually runs | Web: Railway deploy on `master` (D-020). iOS: EAS + TestFlight / App Store |
| **Calendar** | `isLevelReleased` becomes true on the player’s **local** Monday | `src/games/wordfall/schedule.ts` — no I/O |

If the row is not in the installed build by that Monday, the player does not have a new level. The picker cannot download it (D-004). Stale clients keep the last catalog they shipped with.

Web players pick up a merged drop on the next Railway deploy. iOS players pick it up only after they install a build that already contains the row. Batch several Mondays into each store cut so native does not miss weeks while review is in flight.

**Monday itself is a no-op** when the buffer is healthy. Do not treat “merge on Monday morning” as the release. That is too late for iOS and timezone-fragile for web.

---

## 2. Invariants

Do not weaken these to make a week ship.

1. Levels stay bundled TypeScript in `src/data/wordfall/levels.ts`. No remote fetch, CMS, or Supabase read at play time (D-004, D-027).
2. The launch curriculum is levels **1–11** with **no** `availableFrom`. They teach the game on day one. Never time-gate them.
3. Weekly rows start at **12** and are numbered consecutively (`n`, `n+1`, …). `LAST_LEVEL` is derived from the array; do not hardcode it.
4. `availableFrom` is an ISO calendar day `YYYY-MM-DD`, always a **Monday**, always in the player’s local timezone. Invalid dates fail closed (`parseAvailableFrom` returns null → not released).
5. Mondays are consecutive. A skipped Monday is a missed drop. The product promise is one new level every week.
6. A level is a **puzzle** (move budget, no `timeLimitMs`) or a **race** (`timeLimitMs` set, `moves` high enough that the clock is the only way to lose). Never both.
7. Playable = released **and** `number <= unlocked`. Beating level N writes `unlocked = N+1` even if N+1 has not shipped yet, so a later drop does not force a campaign replay.
8. Game reducers stay pure. Schedule math lives in `schedule.ts` and takes `now: Date`. Do not call `Math.random()` or read the clock inside `engine.ts`.
9. Every row has a unique `taskFingerprint` (puzzle vs race plus objective kinds). A weekly drop must not reuse last week's fingerprint, or any other row's. Numeric targets may change; the *question* may not. Do not invent a sixth `Objective` kind.
10. Featured TTL is seven days (`isNewestRelease`). After Sunday the row stays in the catalog so numbering has no holes. Do not delete last week's level to "expire" it.

---

## 3. The catalog is the queue

```
src/data/wordfall/levels.ts    ← hand-authored rows; this file is the schedule
src/games/wordfall/types.ts    ← Level / Objective shape
src/games/wordfall/schedule.ts ← Monday gate, “this week”, next-drop copy
src/ui/screens/WordfallScreen.tsx  ← picker labels + unlock persistence
```

Undated row → live now (launch set).
Dated row whose Monday is still in the future → visible in the picker as “drops …”, not playable.
Dated row whose Monday has arrived, on a client that already contains it → playable if unlocked.

There is no second schedule file. Upcoming Mondays are the `availableFrom` values `> today`. Automation should read this array, not a spreadsheet.

**Today’s catalog:** 1–11 only, all undated. The cadence starts when the first dated row lands. Pick a Monday the web build can actually contain in time; then batch at least `BUFFER_WEEKS` rows in that same PR so week one is not a one-off scramble.

---

## 4. Authoring a drop

Append one object to `LEVELS`. Do not renumber or edit shipped rows except to fix an unwinnable target.

```ts
{
  number: 12,                         // last number + 1
  name: 'Short title',                // picker + result panel
  description: 'One sentence brief.', // player-facing; required
  moves: 16,                          // puzzle: real budget. race: UNLIMITED_MOVES (99)
  // timeLimitMs: seconds(75),        // omit on puzzles
  crates: 0,
  objectives: [{ kind: 'words', target: 6 }],
  availableFrom: '2026-08-31',        // that Monday, never a Tuesday
}
```

### Objective kinds (existing; do not invent a sixth)

| `kind` | Fields | Use when the level is about |
|---|---|---|
| `words` | `target` | Playing the game at all |
| `length` | `minLength`, `target` | Specials / long words |
| `crates` | `target` | Where you play (`target <= crates`) |
| `letter` | `letter`, `target` | Aiming beams at a letter |
| `score` | `target` | Rarity and chains |

### Design bar

Weekly rows are **not** a second tutorial. 1–11 already introduce tracing, length, crates, score, letters, combinations, then the clock. A drop should ask a new combination or a tighter target of a known mechanic — not a new engine rule.

- One idea per level. If you need a sentence with “and also a new rule,” split it or cut it.
- `description` states the objective the HUD will score, not flavour.
- Crate goals cannot exceed crates seeded. That is an unwinnable level.
- Score targets: untimed ≈ 50–55% of a perfect solver on the same budget; timed sit lower (~40%) because the long-word ask fights the highest-scoring short word. Calibrate against the existing solver test, not a guess.
- Time limits are **estimated** at ~7s per human move (`ASSUMED_MS_PER_MOVE` in `engine.test.ts`). The solver finds words instantly; that constant is what makes a clock testable. Tightening past winnability must fail the suite, not a player.

### Next Monday

```
If LEVELS has no availableFrom:
  firstDrop = coming Monday >= today  (if today is Monday, that is too late unless
              the build is already live — use next Monday)
Else:
  firstDrop = last availableFrom + 7 days
```

Never author a Tuesday. Never leave a hole.

---

## 5. Verification (definition of done for a drop)

From the repo root:

```bash
npx vitest run src/games/wordfall/schedule.test.ts src/games/wordfall/engine.test.ts
npm run check
npm run build:web
npm run serve:web
```

`npm run check` is required: a new row is game data. `npm run build:web` then `npm run serve:web` is the local production deploy of `dist/` on port 8080. Playtest that export before `git push` (hub, Wordfall picker, launch 1–11). `npm run web` is the authoring loop, not this gate. Job B will not push a drop that only passed CI in the author's head.

The suite already encodes the contract. A drop that fails any of these is not done:

| Guard | Where |
|---|---|
| Consecutive numbers from 1 | `engine.test.ts` — shipped levels |
| Name, moves, ≥1 objective, targets > 0 | same |
| Crate goal ≤ crates seeded | same |
| Board opens (`status: 'playing'`) on fixed seeds | same |
| **At least one of seeds 11 / 4242 / 90210 wins** | `every shipped level can be finished` |
| Win is not trivial (more than one move) | same |
| Timed: `moves > timeLimitMs/1000` | shipped timed levels |
| Dated rows are real Mondays | `schedule.test.ts` |
| Launch 1–11 stay undated | `schedule.test.ts` |
| Unique `taskFingerprint` across `LEVELS`; consecutive dated weeks differ | `schedule.test.ts` |
| Local `serve:web` picker playtest | Job B / Gauntlet skill — before GitHub |

Add a [CHANGELOG.md](CHANGELOG.md) `[Unreleased]` line: which number, which Monday, one-line idea. That is the player-visible record.

Do not regenerate `dictionary.json`. Weekly levels use the shipped word list (D-018).

---

## 6. Buffer and platforms

**Default buffer: 4 unpublished Mondays** in `LEVELS` whose `availableFrom` is still in the future. Reversible; change the number here if it is wrong, not in a one-off script.

Why 4: App Store review plus a missed week still leaves native clients with upcoming rows. Web could live with 1, but the catalog is shared.

| Platform | How a dated row reaches players | Lead time to respect |
|---|---|---|
| Web | Merge to `master` → CI `check` + `web` → Railway | Hours. Merge **before** that Monday in the player’s timezone |
| iOS | Version bump + tag + `eas build` + submit | Days. The store build must already contain the next buffer of Mondays |

A player who has not updated still has last week’s catalog. That is accepted (D-004). Copy in the picker already degrades to “come back next week” when `nextDropDate` is null **in that build**.

Unlock persistence: `WordfallSave.unlocked` may already be `12` while this build’s last released number is `11`. The screen clamps the current level with `min(unlocked, lastReleasedNumber)`. Do not cap `unlocked` at `LAST_LEVEL` on save.

---

## 7. Automation contract [PLANNED]

Two jobs. Do not collapse them into “generate and push to master on Monday.”

### Job A — Buffer audit (safe to cron)

**When:** weekly, Wednesday 09:00 UTC (mid-week; leaves time to author before the next Monday).

**Input:** `src/data/wordfall/levels.ts` on `master`.

**Pass when all of these hold:**

- Levels 1–11 have no `availableFrom`.
- Numbers are `1..N` with no gaps.
- Every `availableFrom` parses and is a Monday.
- Dated Mondays are consecutive (each is the previous + 7 days).
- Count of rows with `availableFrom > today` ≥ `BUFFER_WEEKS` (4).

**Fail:** open or update an issue / Superthread card titled `Wordfall weekly buffer low` with the missing Mondays listed. Do not auto-merge a stub level.

This job can land as a GitHub Actions `schedule` workflow that runs the existing Vitest catalog tests plus a small buffer assertion. Until that workflow exists, run the same checks by hand before calling the cadence healthy.

### Job B — Author the next drop (agent or human)

**When:** Job A fails, or the owner asks for the next week.

Follow the Cursor skill [wordfall-weekly-gauntlet](../.cursor/skills/wordfall-weekly-gauntlet/SKILL.md). Working title **Gauntlet**. Steps (in order):

1. Read this file, `src/data/wordfall/levels.ts`, and the last 3 weekly rows (or 9–11 if none exist).
2. Compute `nextNumber` and `nextMonday` from §4.
3. Open the Superthread card for this drop and checkout its `suggested_branch_name` ([WORKFLOW.md](WORKFLOW.md)). Do not invent a `feat/` branch (D-021). Recurring cadence may use one standing card per drop or a card-per-week; if the board has no card, **stop and ask** rather than pushing to `master`.
4. Pick a **hard**, **unique** task. `taskFingerprint` (`src/games/wordfall/schedule.ts`) of the new row must not match any existing `LEVELS` row and must not match last week. Fingerprint is puzzle vs race plus kind (`letter` includes the letter, `length` includes `minLength`) — not the numeric targets. Do not invent a sixth objective kind.
5. Clock from the week's **sentiment**: urgent/chase → race (`timeLimitMs`); precise/surgical → puzzle (move budget). Never both.
6. Append the row. Hand-author (or LLM-author) name, description, objectives. Do not copy level 8 with a new date. Featured TTL is seven days (`isNewestRelease`); the row stays in the catalog after Sunday so numbering has no holes. Do not delete last week.
7. Changelog line. Do not bump `package.json` / `app.json` for a web-only drop.
8. **Local verify before GitHub** (mandatory, in order). Stop on the first red:
   - `npx vitest run src/games/wordfall/schedule.test.ts src/games/wordfall/engine.test.ts`
   - `npm run check`
   - `npm run build:web`
   - `npm run serve:web` (local production deploy of `dist/` on port 8080 — not `npm run web`)
   - Playtest that export: hub loads, Wordfall start screen loads, picker shows the new row as **drops {Monday}**, launch 1–11 still play. Future rows are not playable today; the solver test is the winnability proof. Do not undate the row to sneak a playtest.
9. Only then commit, push, and open a PR. CI must be green (`check` + `web`). Merge is a human.

**PR title:** `ST-<id> Wordfall level <n> — <Monday>`
**PR body must state:** number, `availableFrom`, puzzle vs race, fingerprint, solver seeds that won.

### What Monday cron must not do

- Push to `master`.
- Generate a level with placeholder objectives to keep the buffer green.
- Call EAS or App Store submit (owner accounts; see WORKFLOW checklist).
- Fetch levels at runtime or write them to Supabase for the client to read.

### Proposed workflow shape (not in the repo yet)

```yaml
# .github/workflows/wordfall-weekly.yml  — Job A only
on:
  schedule:
    - cron: '0 9 * * 3'   # Wednesday 09:00 UTC
  workflow_dispatch:
```

Job B stays an agent/human loop against this doc. Generating a playable level is a design step; a cron cannot own it.

---

## 8. Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Picker says “come back next week” after a merge | Row has no `availableFrom` and is already the last level, **or** the dated Mondays are all in the past in this build | Append a future Monday |
| Level visible as “drops …” on web but missing on iOS | Store binary is older than `master` | Next EAS cut must include the buffer |
| Level playable a day early / late | Comparing UTC midnight instead of local calendar | Keep `startOfLocalDay` / `parseAvailableFrom` as local `Date(y, m-1, d)` |
| Player beat 11, drop arrived, still locked | `unlocked` not advanced on win | `unlockAfterWin`; do not clamp to `LAST_LEVEL` on save |
| CI red on “every shipped level can be finished” | Target too high or crate goal > crates | Lower `target` or seed more crates |
| Invalid date silently never releases | Typo / 2026-08-32 | `parseAvailableFrom` returns null; tests must catch it |

---

## 9. Out of scope

- More-or-Less and Clueless content (those use the Wikipedia pipeline, not this file).
- New special tiles, dictionary rebuilds, or engine actions.
- A live “level of the week” download.
- Auto-merging PRs.
- Holding the web deploy until iOS review finishes.

---

## 10. Pointers

| Need | Where |
|---|---|
| Why bundled, why Monday, local-before-GitHub | STACK D-004, D-027, D-038 |
| Agent loop | `.cursor/skills/wordfall-weekly-gauntlet/SKILL.md` |
| Player-facing design | BRAINSTORM §9 |
| Ship / PR / Railway | [WORKFLOW.md](WORKFLOW.md) |
| Runtime path | [HOW-IT-WORKS.md](HOW-IT-WORKS.md) Journey 6 |
| Catalog tests | `src/games/wordfall/schedule.test.ts`, `engine.test.ts` |
