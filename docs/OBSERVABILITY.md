# Monitoring and observability

**Status:** Initial PostHog instrumentation implemented; dashboards and operational monitors are managed in their named source systems.
**Last updated:** 2026-08-22
**Owner:** Product and engineering

This document is the source of truth for how WordKrush measures product
improvement, game balance, reliability, content quality, and delivery health.
It defines signals before tools are installed so dashboards answer explicit
questions instead of collecting data without an action.

## Decision and boundaries

Analytics is anonymous and disabled until the player explicitly opts in.
Consent must be revocable. The app must remain fully playable when consent is
declined, PostHog is unavailable, or the device is offline.

- Do not identify signed-in players in PostHog.
- Do not enable autocapture or session replay.
- Do not capture email, phone number, username, profile id, guessed words, item labels,
  image URLs, raw error messages, stack traces, or persisted game state.
- Use bounded enums and numeric aggregates. Do not create event names or
  property keys dynamically.
- Keep analytics outside reducers under `src/games/<game-id>/`. UI and
  platform boundaries observe state transitions after they occur.
- Queueing and delivery are best effort. Telemetry must never block play,
  score persistence, navigation, or startup.
- A separate crash-reporting decision is required before sending stack traces
  or native crash diagnostics to any service.

The PostHog project token and ingestion host are client-visible configuration,
not secrets. They will use `EXPO_PUBLIC_POSTHOG_KEY` and
`EXPO_PUBLIC_POSTHOG_HOST` when implementation begins.

## Signal destinations

| System | Use it for | Do not use it for |
|---|---|---|
| PostHog | Consented product events, funnels, retention, game-balance aggregates, web vitals, coarse client failure counters | Raw exceptions, PII, guessed content, server uptime |
| GitHub Actions | Type/tests, web export, bundle budget, content gates, validator tests, scheduled smoke tests | Player behavior or production latency |
| Railway | Deploy health, process restarts, resource use, static-server logs, service health | Product funnels or native crashes |
| External synthetic check | Public URL uptime and response-contract checks | In-app behavior |
| Supabase | Auth and database service health when runtime features use it | Offline game health |
| EAS / App Store Connect | Build, submission, and native release health | Web deployment or content-pipeline health |
| Future crash reporter | Symbolicated fatal errors and crash-free sessions | Product analytics |

No single dashboard can replace the source systems. The monitoring view should
link to them and summarize only signals that have a clear owner and response.

## Measurement tiers

- **P0 — protect play and data:** fatal sessions, lost scores, production
  availability, broken deploys, and release-invalid content.
- **P1 — improve the product:** activation, completion, retention, game
  balance, startup, progress restore, auth reliability, and web performance.
- **P2 — diagnose and optimize:** navigation details, help usage, image and
  haptic failures, richer game mechanics, and periodic content health.

Thresholds below are starting hypotheses where production baselines do not yet
exist. For those signals, collect two normal release cycles, record p50/p75/p95
or failure-rate baselines, and then set an alert on a sustained material
regression. Do not page on an invented number.

## Product health

### Questions and metrics

| Question | Metric | Definition | Review |
|---|---|---|---|
| Do players reach the core value? | D0 activation | Anonymous installs with `run_completed` within the first opted-in day / installs with `app_opened` | Weekly |
| Which game earns play? | Game mix | Completed runs by `game_id` / all completed runs | Weekly |
| Do players finish what they start? | Completion rate | `run_completed` / `run_started`, segmented by game and resume status | Daily/weekly |
| Do players return? | D1 and D7 retention | Players completing any run 1 or 7 days after first completed run | Weekly |
| Is the loop replayable? | Replay rate | WordKrush comparison-mode `game_over_action=play_again` / completed runs | Weekly |
| Do players explore the collection? | Multi-game rate | Sessions with completed runs in at least two games / active sessions | Weekly |
| Does optional account value convert? | Auth conversion | `auth_succeeded` / `auth_prompt_viewed` | Weekly |

PostHog's anonymous device identifier may be used only after consent. It is not
joined to Supabase identity. `auth_status` may be sent as the bounded value
`guest` or `signed_in`, which supports cohort comparisons without identifying
the account. This measures signed-in behavior on a device but does not claim
cross-device retention; that would require a separate identity and consent
decision.

### Launch event dictionary

These events are the smallest useful first release. The implementation should
expose a typed event map so names and property shapes cannot drift.

| Event | Priority | Trigger and owner | Allowed properties | Answers |
|---|---|---|---|---|
| `analytics_consent_changed` | P0 | Consent control after local preference is written | `choice: opted_in \| opted_out`, `surface: prompt \| settings` | Is the measurement population understood? This event is sent only for opt-in; opt-out is retained locally, not transmitted. |
| `app_opened` | P1 | `App.tsx` mount after telemetry is eligible | `platform`, `app_version`, `backend_configured`, `auth_status` | Active installs and sessions |
| `app_ready` | P1 | `App.tsx` after boards and session restore settle | Above plus `duration_ms`, `boards_result`, `session_result` as bounded enums | Startup success and latency |
| `screen_viewed` | P1 | Observe the `Screen` union in `App.tsx` | `screen_name`, optional `game_id`, `source` | Navigation and funnel entry |
| `game_selected` | P1 | Hub card or drawer navigation | `game_id`, `source: hub \| drawer` | Demand by title and discovery source |
| `run_started` | P1 | WordKrush comparison-mode `startGame`; Clueless/Wordfall after restore resolves | `game_id`, `is_resume`, optional `category_id`, `puzzle_number`, `level_number` | Start rate and resume behavior |
| `run_completed` | P1 | Existing completion callbacks in `App.tsx` | `game_id`, `outcome`, `score`, `score_kind`, `duration_ms?`, `is_new_best`, game context | Completion, retention, and balance |
| `guess_submitted` | P1 | WordKrush comparison mode and Clueless submit handlers | `game_id`, `guess_index`, optional `choice`, `result_kind`, `rank_bucket` | Core-loop depth and input friction |
| `round_resolved` | P1 | WordKrush comparison UI observes reducer result | `correct`, `round_index`, `streak_bucket`, `pair_relaxed` | Difficulty curve and fairness |
| `word_submitted` | P1 | Wordfall submit result | `level_number`, `word_length_bucket`, `valid`, `rejection_kind`, `score_delta_bucket`, `chain_length_bucket` | Input quality and mechanic engagement |
| `level_completed` | P1 | Wordfall won transition | `level_number`, `score`, `duration_ms`, `words_played`, `moves_left_bucket` | Level pass rate and tuning |
| `level_failed` | P1 | Wordfall lost transition | `level_number`, `score`, `duration_ms`, `failure_mode: time \| moves` | Difficulty cliffs |
| `daily_puzzle_viewed` | P1 | Clueless after puzzle restore resolves | `puzzle_number`, `already_completed` | Daily participation |
| `game_over_action` | P1 | WordKrush comparison result-screen action | `action: play_again \| scores \| home`, `streak_bucket`, `is_new_best` | Replay and post-run intent |
| `scores_viewed` | P2 | Scores screen mount | `game_id`, `run_count_bucket`, `has_highlight`, `auth_status` | Score-surface value |
| `auth_prompt_viewed` | P1 | Scores screen shows eligible account prompt | `game_id`, `run_count_bucket` | Account CTA reach |
| `auth_submitted` | P1 | Auth form after local validation (magic-link send or OTP code) | `mode: sign_in \| sign_up`, `validation_result`, `error_category?` | Form friction |
| `auth_succeeded` | P1 | Session established (magic-link click or OTP verify) | `mode` | Account conversion |
| `auth_failed` | P1 | Auth operation fails | `mode`, `error_category: credentials \| network \| rate_limit \| unconfirmed \| other` | Actionable auth failure mix |
| `auth_skipped` | P2 | Auth skip action | none | Prompt abandonment |
| `auth_session_restored` | P1 | Startup session restore succeeds | `result: signed_in` | Signed-in startup reliability without exposing account identity |
| `signed_out` | P2 | Sign-out operation succeeds | none | Account disengagement and session lifecycle |

`score` has different semantics across games, so every completed run includes
`score_kind`: `streak` for WordKrush comparison mode, `guesses_used` for Clueless, and
`points` for Wordfall. Cross-game charts must not sum or average raw scores.

### Later diagnostic events

Add these only when a named dashboard or investigation needs them:

- `help_opened` and `help_closed` with game, context, and duration.
- `progress_restored` and `progress_discarded` with a bounded reason.
- `pair_difficulty_relaxed` with a streak band, not item data.
- `level_outcome_action` and `level_selected`.
- `wordfall_chain_resolved` using only length and special-type enums.
- `card_image_load_failed`, sampled and without label or URL.
- `haptic_invoke_failed`, sampled on native only.
- `drawer_opened` and `navigation_selected` for path analysis.

Do not capture reducer ticks, touch coordinates, full traces, every board
mutation, or automatic DOM/native interactions.

## Game-balance scorecards

### WordKrush comparison mode

- Median and p90 final streak.
- Percentage of runs reaching streak 5, 10, and 20.
- Correct rate and terminal-loss rate by streak bucket.
- Percentage of rounds and runs requiring relaxed pairing.
- Replay rate after each final-streak bucket.

Investigate a rise in relaxed pairing before changing difficulty. It can mean
the content pool is too flat, not that player skill changed.

### Clueless

- Starts and wins by `puzzle_number`.
- Median and p90 guesses used for completed puzzles.
- Completion rate and rank-bucket progression by guess index.
- Invalid, duplicate, and unranked guess rates.
- Consecutive-day participation after a completed puzzle.

Never capture the submitted word. Rank and validation buckets answer the
balance question without collecting player-entered text.

### Wordfall

- Start, pass, and fail rate by level.
- Median and p90 completion time and score by level.
- Failure mode split for timed and move-limited levels.
- Valid submission rate and word-length distribution.
- Level-to-level progression and replay rate.
- Chain-length and special-mechanic aggregates when tuning requires them.

Alert only on large sustained changes after a baseline exists. Level metrics
are primarily weekly design-review signals, not operational pages.

## Reliability and performance

| Signal | Priority | Source boundary | Destination | Initial objective and action |
|---|---|---|---|---|
| Fatal/render failure | P0 | Root error boundary and global handlers near `index.ts` / `App.tsx` | Future crash reporter; coarse count in PostHog | Target crash-free sessions above 99.5%. Block rollout on a release-correlated spike. |
| Score persistence failure | P0 | `src/scores/storage.ts` load/save/migration catches | PostHog | Target below 0.5% of score writes. Investigate platform and release immediately because a player can lose history. |
| Progress persistence failure/discard | P1 | `src/games/progress.ts` | PostHog | Baseline first; investigate a release-relative doubling or rate above 2% of loads. |
| Startup readiness | P1 | `App.tsx` restore flow | PostHog | Track p50/p95 by platform and release; investigate p95 regression above 25%. |
| Wordfall ready time | P1 | `WordfallScreen` load completion | PostHog | Baseline first; investigate blank-state time above the agreed UX budget. |
| Auth operation result | P1 | `src/auth/auth.ts` result boundaries | PostHog + Supabase logs | Target successful sign-in above 95% when configured and online; use bounded errors only. |
| Backend configuration | P1 | `src/auth/client.ts` exposed as startup boolean | PostHog + deploy checklist | Alert if production unexpectedly reports `backend_configured=false`. |
| Core Web Vitals | P1 | Web-only performance observer | PostHog | LCP p75 below 2.5s and INP p75 below 200ms are initial web targets; segment by release. |
| Image fallback | P2 | WordKrush comparison card `onError` | Sampled PostHog | Review weekly; a broad spike suggests an upstream image outage. |
| Offline play | P2 | Session/network boundary | PostHog when delivery resumes | Compare completion and persistence outcomes for offline-capable sessions. |

Exceptions sent to PostHog must be categorized locally. Raw `Error.message`,
Supabase responses, URLs, storage values, and stack traces are prohibited.

## Web production and deployment

| Monitor | Source | Objective | Alert |
|---|---|---|---|
| Public shell availability | External `GET /` synthetic | 99.9% monthly; `200 text/html` with known app marker | Three failures across five minutes |
| Main bundle availability | Synthetic URL discovered from the shell | `200` or valid `304`, JavaScript content type, immutable cache policy | Failure after deploy |
| Railway deployment | GitHub Actions and Railway | Every green `master` revision deploys the same SHA | Deploy failed or was skipped |
| Process health | Railway metrics | No restart loop; CPU/memory within normal baseline | Repeated restarts or sustained resource saturation |
| Static response latency | Synthetic/Railway | Baseline p50/p95 for `/` and main bundle | Sustained p95 regression above 50% |
| Cache contract | Synthetic | HTML `no-cache`; hashed Expo assets `immutable`; ETag revalidation works | Contract mismatch |
| Web export | GitHub Actions | `npm run build:web` passes before deployment | Any failure |
| Bundle size | GitHub Actions | Record brotli and raw main-bundle size | More than 10% growth without an approved explanation |

Railway's existing `/` health check proves only that the process can return the
shell from inside the platform. The external synthetic proves public routing,
TLS, content type, and the app asset contract.

## Content, pipeline, and release health

| Gate or metric | Priority | Source | Rule |
|---|---|---|---|
| Provisional category data | P0 | `src/data/categories/*.json` tests | Release branches contain zero `provisional: true` categories |
| Snapshot provenance | P0 | Category data and export pipeline | Published categories include `snapshotId`, source, and update metadata |
| Type and test health | P0 | `npm run check` | Zero failures |
| Web export health | P0 | `npm run build:web` | Zero failures before deploy |
| Validator tests | P1 | `npm run test:validator` | Zero failures in CI |
| Category fairness | P0 | `src/data/categories.test.ts` | Keep existing ratio guard, spread, and per-band coverage green |
| Export shrink | P1 | Content JSON diff | Review a count reduction above 10% |
| Data freshness | P1 | `updatedAt` | Review category snapshots older than 90 days |
| Image coverage and rights | P1 | Category tests/pipeline | At least 90% coverage where expected; every image retains free-license attribution |
| Ingest flags | P1 | Pipeline/Supabase | No flagged rows in a published snapshot; review every greater-than-10x swing |
| Validator smoke | P1 | Scheduled `npm run smoke` | Zero unexpected FAIL results; known divergences remain explicit WARNs |
| Wordfall dictionary age | P2 | Generated metadata | Review after 180 days or a vocabulary-quality issue |
| Native release | P1 | EAS/App Store Connect | Production build and submission status linked to the release version |

The current bundled WordKrush comparison category is provisional and lacks a
`snapshotId`. That is a release-quality blind spot to resolve in the
implementation phase; this blueprint does not alter content.

## Dashboard specification

### 1. Product Health — PostHog

- Active anonymous players and completed runs.
- D0 activation and D1/D7 completed-run retention.
- Starts, completions, completion rate, and replay rate by game.
- Activation, completion, replay, and on-device retention segmented by
  `auth_status` to compare guests with signed-in players.
- Screen-to-run funnel: app open → game selected → run started → run completed.
- Optional account funnel: prompt → submit → success.
- Signed-in session restore success and sign-out rate.

### 2. Game Balance — PostHog

- WordKrush comparison streak distribution, loss curve, and relaxed pairing.
- Clueless completion and guesses-used distribution by puzzle.
- Wordfall pass/fail, duration, score, and progression by level.
- Release comparison for every balance chart.

### 3. Reliability — PostHog plus crash reporting

- App readiness p50/p95 and Wordfall readiness.
- Score/progress persistence failures and discard reasons.
- Auth success and bounded failure categories.
- Core Web Vitals by release and platform.
- Fatal issues widget only after a crash reporter is approved and configured.

### 4. Web Production — Railway, GitHub, synthetics

- Current production revision and last successful deployment.
- Uptime, shell/bundle response contract, and p95 latency.
- Restarts and resource saturation.
- Web export status and bundle-size trend.

### 5. Content Quality — CI, pipeline, Supabase

- Provisional and provenance gate status.
- Data age, item count, image coverage, value spread, and fair pairs per band.
- Ingest flags, export shrink, and validator smoke outcomes.
- Clueless puzzle integrity and Wordfall winnability/dictionary checks.

### 6. Release Health — GitHub, Railway, EAS

- CI status, deploy status, deploy SHA, and time since last release.
- Web production version versus `master`.
- Native build/submission status versus app version.

## Alerting contract

An alert must identify an owner, a user impact, and a first response. If no one
would act immediately, keep it as a dashboard review metric.

### Automatic alerts

- Production shell or main bundle is unavailable.
- Railway deployment fails, is skipped, or does not match the green master SHA.
- A release causes a fatal-session or score-persistence failure spike.
- CI, web export, or a release content gate fails.
- Production unexpectedly lacks required client configuration.
- Scheduled validator smoke produces an unexpected FAIL.
- Core Web Vitals regress materially for two consecutive review windows.

### Review-only signals

- Game mix, replay, retention, help usage, and navigation paths.
- Difficulty distributions and level/puzzle balance.
- Image fallback, haptics, and expected validator WARNs.
- Content age before its review threshold and normal bundle movement.

## Implementation map

Implemented:

1. `src/analytics/` owns the typed event dictionary, privacy gate, PostHog
   client, and a pure no-op runtime sink for storage boundaries.
2. Consent is stored locally, defaults to unknown/off, appears as a first-run
   prompt, and can be revoked or reviewed from the drawer.
3. `App.tsx` owns startup, navigation, completion, score, auth-status, and
   consent lifecycle events.
4. Game screens own bounded submit and outcome events; guessed words, item
   labels, URLs, and reducer state are never sent.
5. Score and progress persistence report only operation and bounded failure
   category without changing the offline-first fallback.
6. `.env.example` documents the public PostHog project token and EU ingestion
   host. Railway receives the same values during its Expo web build.
7. Focused tests cover consent parsing, explicit opt-in, allowlisted event
   names, no-op behavior, and property bucketing.

Still separate:

- PostHog dashboards are created from the event dictionary after production
  events exist; empty charts are expected until players opt in.
- Railway uptime/resource monitoring and GitHub build gates remain operational
  signals rather than PostHog events.
- Native crash reporting requires its own stack and privacy decision.

If cross-device funnels or retention become necessary, add a later decision
covering explicit account linkage, identifier pseudonymization, deletion, and
consent wording before calling PostHog `identify`. Signed-in status alone is
enough for the first dashboard and avoids that data-governance expansion.

## Review checklist

- Every event answers a named question and has an owner or dashboard.
- Event and property names are static, typed, and documented.
- Properties are bounded; free text and PII are absent.
- Consent defaults to off and can be revoked.
- Metrics preserve each game's score semantics.
- Telemetry failures cannot affect gameplay.
- Pure game engines remain platform-free and deterministic.
- Alerts represent actionable user impact; review metrics do not page.
- Dashboard thresholds distinguish measured baselines from hypotheses.
