# Changelog

All notable changes to Best Games. Format follows [Keep a Changelog](https://keepachangelog.com); versions follow semver and match `version` in `package.json` / `app.json`.

Rules:
- Every PR that changes behavior adds a line under **[Unreleased]** in the same PR.
- On release: rename [Unreleased] to the version + date, create a fresh empty [Unreleased], bump `package.json` + `app.json`, tag `v<version>`, then `eas build --platform ios` → TestFlight.

## [Unreleased]

### Added
- Expo SDK 57 + TypeScript scaffold (iOS + web from one codebase)
- Pure game-logic layer `src/game/` with ratio-based pairing fairness guard and streak difficulty bands, unit-tested (Vitest, 9 tests)
- Content pipeline: Supabase Postgres schema (`supabase/migrations/0001_init.sql`), source-agnostic ingest with batch fetch + sanity checks (`pipeline/ingest.ts`), snapshot export to bundled JSON (`pipeline/export-snapshot.ts`), deterministic mock data source
- First category keyword list: Search Popularity, 40 terms (`pipeline/keywords/google-search.json`)
- EAS build profiles (`eas.json`): development / preview (simulator) / production
- GitHub Actions CI: typecheck + tests on every push and PR
- Docs: STACK, BRAINSTORM, WORKFLOW, HOW-IT-WORKS (living system explainer), this changelog

- LLM validator service (`validator/`): Pydantic restricted schema, OpenAI structured outputs at `temperature=0`, position-bias consistency check across both pair orderings, narrow flagging policy, FastAPI endpoints + CLI tester, 18 offline tests
- Roadmap (`docs/ROADMAP.md`) mirroring the Superthread *BestGame* board; 26 backlog cards created
- **Wikimedia pageviews source adapter** (`pipeline/sources/wikipedia.ts`): median over 6 complete months, redirect-resolved article titles, bounded concurrency, descriptive User-Agent
- First real category: **Popularity** — 50 globally recognizable entities, measured monthly Wikipedia pageviews (`src/data/categories/wikipedia-popularity.json`)
- `npm run pipeline:preview` — dev path writing category JSON directly, marked `provisional: true` (no Supabase provenance; not for release)
- Dataset integrity tests (`src/data/categories.test.ts`): value range, uniqueness, provenance fields, and usable pair counts at every difficulty band
- Smoke tests (`validator/smoke/`) — real-API end-to-end checks with PASS/WARN/FAIL, separate from unit tests and excluded from CI

- **Third game: Wordfall** (`src/games/wordfall/`, `src/ui/wordfall/`, `src/ui/screens/WordfallScreen.tsx`) — trace words across a 7×8 letter grid; the word's own linguistic properties decide which special tile it leaves behind, and that tile changes the board when a later word runs through it
  - Special-tile rules as priority-ordered data (`linguistics.ts`): **Ember** (word uses J/Q/X/Z → clears every tile of its letter), **Nova** (7+ letters → 3×3), **Beam** (5–6 letters → row and column), **Flare** (double letter → both diagonals). First match wins, so the reward is always predictable; the how-to-play legend renders from the same table the engine matches on
  - Word rarity multiplies the score rather than granting a fifth tile — spelling THE repeatedly is not a strategy
  - Pure engine (`engine.ts`) as a `(state, action, context) => state` reducer covering tracing, chain reactions with cycle protection, gravity, refill, crates, five objective kinds, and a dead-board reshuffle rescue
  - 11 levels with hand-authored objectives (`src/data/wordfall/levels.ts`); score targets calibrated against a simulated perfect solver, not guessed
  - 139 tests, including one per level proving it can actually be finished
- **Timed levels in Wordfall** — levels 9–11 introduce a countdown and then build on it, following the same curriculum as the other mechanics
  - A level is a puzzle (move budget) or a race (clock), never both: two limits on the same turn leave one as decoration, since whichever is tighter decides every run. `Level.timeLimitMs` is optional, and the HUD's first slot shows whichever limit is live
  - The engine never reads a clock — the UI reports absolute elapsed time through a `tick` action, so the reducer stays pure and a test can run a whole minute in one dispatch. Ticks are monotonic, so a device clock jumping backwards cannot rewind a player out of losing
  - Level 9 asks for the same six words as level 1, with the clock as the only change — introducing a mechanic alongside a new objective makes it impossible to tell which one is beating you
  - The clock pauses while the how-to-play or level sheet is open, stops on the winning move, and survives leaving the screen without charging for the gap
  - Time limits are estimates, not calibration: a solver finds words instantly and cannot measure a human scanning a grid. The suite pins the assumption they were sized from (~7s per move) so tightening one past winnability fails loudly
- **Completion time is recorded and shown** — `ScoreEntry.durationMs` (optional; More or Less has nothing meaningful to report), rendered on the level-complete card and in the scores list
  - Scores rows now label the unit from the registry instead of hardcoding "rounds", which read as "8,436 rounds" for Wordfall and "5 rounds" for Clueless
- **Wordfall dictionary** (`npm run pipeline:wordfall` → `src/data/wordfall/dictionary.json`, 550 KB) — Webster's 1913 (public domain) plus a curated core-English and modern-word supplement, intersected with the existing Clueless frequency vocab to produce a rarity ranking and measured per-letter spawn weights
  - Inflections are derived at lookup by suffix-stripping rather than stored: 40% smaller than generating them (995 KB → 550 KB) and better recall, since it covers words the generator never would
  - Lookup binary-searches packed fixed-width strings, so there is no Set to hydrate and no startup cost

- **Web hosting on Railway** (`railway.json`, `server/serve.mjs`) — resolves STACK O-6. Live at https://web-production-548e8.up.railway.app
  - Railway builds from source (`npm run build:web`) and serves `dist/` with a zero-dependency Node static server: brotli pre-compressed at boot (2.89 MB → 0.77 MB over the wire), ETag/304 revalidation, `immutable` caching for Expo's hashed bundle and `no-cache` for the `index.html` that points at it, and SPA fallback for extensionless routes only
  - `npm run serve:web` runs the same server locally, so a production build can be checked before it ships
  - CI deploys on green `master` only (`.github/workflows/ci.yml`); the job skips with a warning when `RAILWAY_TOKEN` is absent rather than failing the build

### Security
- Untracked `.env` from git before Supabase keys could be pushed; added `.gitignore` + `.env.example`
- Normalized malformed `open_ai_api ` env line (space before `=` made the key unparsable) to `OPENAI_API_KEY`

## [0.0.0] - 2026-08-16

- Repo created.
