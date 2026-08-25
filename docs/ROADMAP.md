# Roadmap & Task List

**Last updated:** 2026-08-25
**Board of record:** Superthread → *My Private Space* → **BestGame** board (team `tbJ3qEwK`, board `2`, lists: To do `8` / Doing `9` / Done `10`).

Live status lives on the board, not here. This file exists so an LLM reading the repo cold knows what the work *is*, what blocks it, and what order it goes in — without needing board access.

Every task card should carry the same contract from [WORKFLOW.md](WORKFLOW.md): Description, Context, Scope, Acceptance criteria, Verification, Sign-off. That is how we keep work decision-ready without guessing.

## How to work this list (for any LLM picking this up)

1. Read [HOW-IT-WORKS.md](HOW-IT-WORKS.md) → [STACK.md](STACK.md) → [BRAINSTORM.md](BRAINSTORM.md) first.
2. Pick a task whose blockers are clear and whose card already has Description, Context, Scope, Acceptance criteria, Verification, and Sign-off. **Never start a `[decide]` task** — those are the owner's calls.
3. Follow [WORKFLOW.md](WORKFLOW.md): use the Superthread card's git branch name (`suggested_branch_name`) → build with tests → `npm run check` → new changelog version + `package.json` / `app.json` bump → docs update → open a PR. Features and fixes never land on `master` without a PR. Stacked PRs are allowed.
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
- [ ] **Fill blank More or Less cards when the Wikipedia lead is non-free** (ST-79) — **Doing**; fall back to other freely-licensed photos on the article
- [ ] **Weekly Wikipedia popularity snapshot cron** (ST-75) — **Doing**; Monday GitHub Action re-measures the curated list and opens a review PR (D-036). The 2026-08-24 run failed `check:docs` on the D-041 patch bump; version-only manifests no longer require STACK/HOW-IT-WORKS (D-049).
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
- [ ] **Wordfall match juice** (ST-80) — **Doing**; puff-then-fall on `lastPlay.cleared`, special-birth pop, Crush/Nova stamp. RN `Animated`, not Lottie.
- [ ] **Mobile hub layout, laptop chrome, and team CRUD** (ST-85) — **Doing**; phone is full-bleed, laptop is a wide column, Teams can rename/leave/disband. Needs `0006` and `0007` on the project.

## Track: Clueless

- [x] **Daily difficulty modes** (ST-82) — **Done**; Easy opens with a reviewed thematic sentence, Standard reveals it after 15 valid guesses, Expert has no hint. The first valid guess locks the day, and local/global scores are partitioned by mode.

## Track: teams / live races

- [ ] **Teams and live races** (ST-83) — **Doing**; private invite-only crew, 2–4 player simultaneous races on a numbered path, dual team/personal unlock. Needs `0006_teams_and_live_matches.sql` applied on the project.

## Track: native / App Store readiness

Guideline 4.2 rejects apps that are too thin. These are the mitigation:

- [ ] Haptics (`src/native/haptics.native.ts` + `.web.ts` no-op twin) — tap feedback only; web stays a no-op
- [ ] Game Center leaderboard for best streak — native 4.2 evidence and score persistence
- [x] App icon + splash from the brand kit (`assets/logo/`, `docs/branding/`) — store screenshots still outstanding

## Track: accounts

- [ ] **Supabase magic-link sign-in** (ST-73) — email magic link shipped; phone/SMS identity is superseded by ST-77.
- [ ] **One unique username; email-only sign-in** (ST-77) — **Doing**; unique `players.display_name`, magic link only (D-037). Owner must apply `0004_unique_username.sql`.
- [ ] **Magic-link redirect, WordKrush email, and tab icon** (ST-76) — **Doing**; absolute `emailRedirectTo`, branded Magic Link HTML, cache-busted favicon PNG.
- [ ] **Tuesday player email via Resend** (ST-86) — **Doing**; Broadcast to confirmed Auth users after Wordfall’s Monday drop (D-052). Secrets on GitHub Environment `best-games`.

## Track: Reddit (Devvit) surface — `reddit/`

Distribution experiment, More or Less only. Decision and costs: STACK D-042.
Local contract: [reddit/README.md](../reddit/README.md).

- [x] Devvit Web project that shares the Expo engine and snapshot rather than forking them — `additionalSourceRoots` + an explicit crossing-file list in `reddit/tools/tsconfig.shared.json`
- [x] Server-owned run — the client never gets the seed or a hidden value and never asserts a score; verified by the build (no pool, values, or engine in either client bundle)
- [x] Per-post board in Devvit Redis, first completed run only; logged-out players can play but are not ranked
- [x] Daily post from a date-derived seed (13:00 UTC cron), idempotent per calendar day; moderator menu item and install trigger share the same path
- [x] Spoiler-free result grid + "Copy result" — nothing comments on a player's behalf
- [ ] **`devvit login` + playtest subreddit** ← blocked on the owner
- [ ] **Pick a launch subreddit and ask its moderators** ← blocked on the owner; this is the decision the channel lives or dies on
- [ ] **`devvit publish` → app review** ← blocked on the two above
- [ ] **CI job for `reddit:types` + `reddit:build`** — deliberately not added yet; a second surface with no automated check is exactly the drift D-042 admits to, but changing CI is an owner call
- [ ] Consider a "yesterday's answers" comment so the post has a spoiler-safe payoff after the day closes

## Track: infra

- [x] GitHub Actions CI (typecheck + TS tests)
- [ ] Documentation sync enforcement (ST-71) — **Doing**; path-based local/CI audit plus one completion hook
- [ ] Add the Python validator suite to CI — must run with `validator/` as cwd (`npm run test:validator`), else pytest loses `asyncio_mode` and the async tests error out
- [x] Web deploy to Railway after green CI (STACK D-020)
- [ ] **Railway Expo export needs `CI=true`** (ST-74) — **Doing**; Nixpacks leaves `CI` empty and Expo throws `GetEnv.NoBoolean`. Service is `wordcrush`.
- [ ] **Wordfall weekly Gauntlet agent loop** (ST-78) — **Doing**; unique `taskFingerprint`, seven-day featured window, local `serve:web` playtest before GitHub (D-038).
- [ ] First TestFlight build ← blocked on Apple Developer + Expo login

## Suggested order

1. Owner clears the setup blockers (parallel, no code dependency).
2. **Engine reducer + seeded selection** — highest value, blocked by nothing, makes the game provable in a terminal.
3. Validator → CI, and validator → `ingest.ts`.
4. Mechanic decision lands → UI track opens.
5. Native hooks → TestFlight.
6. Future category expansions or metric upgrades only after gameplay feels right.
