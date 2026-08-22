# Roadmap & Task List

**Last updated:** 2026-08-22
**Board of record:** Superthread → *My Private Space* → **BestGame** board (team `tbJ3qEwK`, board `2`, lists: To do `8` / Doing `9` / Done `10`).

Live status lives on the board, not here. This file exists so an LLM reading the repo cold knows what the work *is*, what blocks it, and what order it goes in — without needing board access.

Every task card should carry the same contract from [WORKFLOW.md](WORKFLOW.md): Description, Context, Scope, Acceptance criteria, Verification, Sign-off. That is how we keep work decision-ready without guessing.

## How to work this list (for any LLM picking this up)

1. Read [HOW-IT-WORKS.md](HOW-IT-WORKS.md) → [STACK.md](STACK.md) → [BRAINSTORM.md](BRAINSTORM.md) first.
2. Pick a task whose blockers are clear and whose card already has Description, Context, Scope, Acceptance criteria, Verification, and Sign-off. **Never start a `[decide]` task** — those are the owner's calls.
3. Follow [WORKFLOW.md](WORKFLOW.md): use the Superthread card's git branch name (`suggested_branch_name`) → build with tests → `npm run check` → changelog line → docs update → open a PR. Features and fixes never land on `master` without a PR. Stacked PRs are allowed.
4. Move the card on the board and tick the box here in the same PR.

### Superthread API notes (learned the hard way)

- Base: `https://api.superthread.com/v1/{team_id}/...`, header `Authorization: Bearer $SUPERTHREAD_API`.
- `GET /v1/users/me` is the only unscoped endpoint; team id comes from `user.teams[0].id`.
- `GET /v1/{team}/boards` **requires** `project_id`; `bookmarked` and `archived` are filters, not substitutes. Use `?project_id=2&archived=false` for BestGame.
- `POST /v1/{team}/cards` body: `{title, content, board_id, list_id}` (ids are strings).
- Cards expose `suggested_branch_name` (same value as **Copy git branch name**). Use that exact string as the git branch when opening the PR.
- **Cloudflare returns 403 "error code: 1010" for the default Python-urllib User-Agent.** Set a normal `User-Agent` header or use curl.

---

## Blocked on the owner — no code can unblock these

- [ ] **Buy Apple Developer Program** ($99/yr) — blocks TestFlight and submission
- [ ] **`npx expo login`** + link EAS project — blocks `eas build`
- [ ] **Apply `supabase/migrations/0001_init.sql`** in the Supabase SQL editor — blocks the whole pipeline
- [ ] **Confirm the core mechanic** (BRAINSTORM [OPEN]) — blocks UI

### The shipped v1 metric, stated plainly

The first shipped category uses monthly Wikipedia pageviews, not Google searches. The metric is measured, free, and already wired through `pipeline/sources/wikipedia.ts`, `src/data/categories/wikipedia-popularity.json`, and the validator/export path. Treat the label as settled: **monthly Wikipedia pageviews**. If a future paid keyword source is ever added, it is a separate upgrade, not a v1 blocker.

## Track: More-or-Less logic (`src/games/more-or-less/`) — pure TS, no UI needed

- [x] Fairness guard + difficulty bands (`pairing.ts`, 9 tests)
- [ ] Engine reducer — pure `(state, action) => state`; actions `newRun` / `guess` / `nextRound`, no side effects
- [ ] Seeded RNG + `selectNextPair` — deterministic, fairness-aware, run-local seen set
- [ ] Scoring — streak, best streak, lives; support both life modes via config
- [ ] Anti-repeat within a run — prevent immediate repeats; reset the seen set only when the pool is exhausted

## Track: content pipeline

- [x] Supabase schema, ingest with sanity checks, snapshot export, Wikipedia pageviews source
- [x] LLM validator service (`validator/`, 18 tests) — schema, consistency check, flagging, playability checks
- [x] First shipped category: `wikipedia-popularity` — monthly Wikipedia pageviews
- [ ] **Weekly Wikipedia popularity snapshot cron** (ST-75) — **Doing**; Monday GitHub Action re-measures the curated list and opens a review PR (D-036)
- [ ] Wire validator into `pipeline/ingest.ts` (`POST /validate/batch`) — batch-validate incoming rows and quarantine flagged pairs
- [ ] Run ingest → export end-to-end against live Supabase ← blocked on migration — prove the factory path after the SQL schema lands
- [ ] Human review queue for flagged pairs (v1: a CLI that prints them) — owner can approve or reject, not silently auto-fix

## Track: UI

- [ ] Home screen — game logo, Play, best streak, category picker
- [ ] Game screen — comparison panels, MORE/LESS controls, current streak
- [ ] Count-up reveal — animate the hidden value after the answer
- [ ] Game over screen — final streak, best streak, replay/share
- [ ] **Show data provenance** — "Source: X, month year" on the reveal; the claim on screen must match the snapshot
- [ ] **Lottie celebration kit** (ST-72) — remaining deer poses, streak flame, result bursts; owner shares lottie.host *file* URLs. Hub idle deer + player already exist locally (`src/ui/lottie/`, D-032). Not on Wordfall tiles or text pills.

## Track: native / App Store readiness

Guideline 4.2 rejects apps that are too thin. These are the mitigation:

- [ ] Haptics (`src/native/haptics.native.ts` + `.web.ts` no-op twin) — tap feedback only; web stays a no-op
- [ ] Game Center leaderboard for best streak — native 4.2 evidence and score persistence
- [x] App icon + splash from the brand kit (`assets/logo/`, `docs/branding/`) — store screenshots still outstanding

## Track: accounts

- [ ] **Supabase magic-link + SMS sign-in** (ST-73) — **Doing**; replaces the ST-61 password form. Email magic link (D-033) and phone SMS OTP (D-034) on the same optional Supabase Auth project. Owner still needs Site URL `https://wordkrush.com`, the redirect allow-list, custom SMTP (to unlock the WordKrush template), and an SMS provider under Phone settings.

## Track: infra

- [x] GitHub Actions CI (typecheck + TS tests)
- [ ] Documentation sync enforcement (ST-71) — **Doing**; path-based local/CI audit plus one completion hook
- [ ] Add the Python validator suite to CI — must run with `validator/` as cwd (`npm run test:validator`), else pytest loses `asyncio_mode` and the async tests error out
- [x] Web deploy to Railway after green CI (STACK D-020)
- [ ] First TestFlight build ← blocked on Apple Developer + Expo login

## Suggested order

1. Owner clears the setup blockers (parallel, no code dependency).
2. **Engine reducer + seeded selection** — highest value, blocked by nothing, makes the game provable in a terminal.
3. Validator → CI, and validator → `ingest.ts`.
4. Mechanic decision lands → UI track opens.
5. Native hooks → TestFlight.
6. Future category expansions or metric upgrades only after gameplay feels right.
