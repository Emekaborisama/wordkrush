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

### Security
- Untracked `.env` from git before Supabase keys could be pushed; added `.gitignore` + `.env.example`
- Normalized malformed `open_ai_api ` env line (space before `=` made the key unparsable) to `OPENAI_API_KEY`

## [0.0.0] - 2026-08-16

- Repo created.
