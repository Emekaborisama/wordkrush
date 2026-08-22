# Agent Guide — WordKrush

This is the operating guide for every human or LLM working in this repository.
Read it before making changes. It exists to keep the project coherent while the
app, data, and release process are still taking shape.

## Project at a glance

**WordKrush** is a collection of casual games for iOS and web designed to
strengthen cognitive skills and pattern recognition through repeated play. Its
core comparison mode asks a player whether a hidden item has a greater or
lesser value than a revealed item: guess correctly, keep the streak alive, and
beat your best score.

The repository has an Expo + TypeScript scaffold, but the actual game engine,
data set, tests, and game UI are still to be built. Do not infer that a feature
exists merely because a document describes it.

## Source of truth and document precedence

Read the documents relevant to your change before editing:

| Need | Source of truth |
|---|---|
| Product mechanics, unknowns, and data rules | `docs/BRAINSTORM.md` |
| Visual identity, logo, and brand colour | `docs/branding/` |
| Technology choices, constraints, and test strategy | `docs/STACK.md` |
| Collaboration workflow and definition of done | `docs/WORKFLOW.md` |
| Wordfall Monday drops and weekly automation | `docs/WORDFALL-WEEKLY.md` |
| Local commands and dependency versions | `package.json` |
| Secrets and environment-variable boundaries | `.env.example` and `.gitignore` |
| Cross-agent working agreement | This file |

When sources conflict, do not silently choose one or overwrite either. Report
the conflict, preserve existing work, and ask the owner for a decision unless a
more recent documented decision clearly resolves it. Update the relevant docs
as part of any intentional product or stack decision.

`docs/BRAINSTORM.md` labels statements as **[GIVEN]**, **[ASSUMED]**, or
**[OPEN]**. Treat **[GIVEN]** as authoritative. Do not implement an **[OPEN]**
decision as permanent product behaviour. If a temporary implementation is
needed, isolate it behind a named configuration/default and document it.

## Precision operating standard

Apply this standard to every code task and factual project answer.

- **Scope:** Do only the requested result, the minimal supporting changes, and
  proportionate verification. Treat features, dependencies, broad refactors,
  unrelated fixes, migrations, and product decisions as out of scope unless the
  owner explicitly approves them.
- **Context:** Before changing code or making a factual claim, inspect the
  relevant instructions, implementation, tests, configuration, and worktree.
  Use the available conversation context for simple direct answers; verify
  unstable facts instead of guessing.
- **Design:** Find and extend the existing owner of a behavior before adding a
  parallel path. Keep one source of truth, reuse established patterns, and
  remove genuine duplication without creating premature abstractions.
- **Quality:** Write the smallest strongly typed, maintainable solution that
  handles meaningful errors and edge cases. Never weaken types, tests, or
  checks merely to make a change pass.
- **Verification:** Run focused validation for every change. Run `npm run
  check` for behavior, logic, data, dependency, configuration, or shared-code
  changes; run `npm run build:web` for relevant web/UI changes. State exactly
  what ran, what passed, and what could not be run.
- **Communication:** Lead with the result. Do not repeat the request or the
  conclusion. At handoff, give only changed files, verification, and material
  remaining risks or decisions.

Escalate after investigation when a missing decision would materially affect
behavior, architecture, cost, security, data, or deployment.

## Superthread task cards

When you create or update a Superthread card for this repo, follow the task
contract in `docs/WORKFLOW.md`: Description, Context, Scope, Acceptance
criteria, Verification, Sign-off. Keep cards outcome-first and Kanban-native
(`To do` → `Doing` → `Done`). If a missing decision would materially change
behavior, architecture, cost, security, or deployment, mark the card blocked on
the owner instead of widening scope.

Every feature or fix is a pull request. Use the Superthread card's git branch
name (`suggested_branch_name` / Copy git branch name) when creating the branch
and opening the PR. Do not invent a different branch name. Stacked PRs are
allowed; see `docs/WORKFLOW.md`.

## Non-negotiable architecture

- Use TypeScript with strict typing. Do not add `any`, disable strict mode, or
  paper over type errors with broad casts.
- Keep each game's logic in `src/games/<game-id>/`. Reducers and deterministic
  logic there must never import React, React Native, Expo, storage, network
  clients, timers, or other platform APIs.
- Model game behaviour as deterministic, testable functions. The engine should
  remain a pure reducer: `(state, action) => state`.
- Pass a seeded RNG into pairing/sequence logic; do not call `Math.random()`
  inside the game engine.
- Keep UI as a renderer and dispatcher over the engine. Platform effects such
  as haptics, persistence, sharing, and Game Center belong outside game
  reducers; shared adapters can live directly under `src/games/`.
- Keep v1 offline-first with bundled static data. Do not introduce a backend,
  account system, analytics SDK, or remote content dependency without an
  explicit owner decision and matching documentation update.
- Build for React Native primitives that also work on web. Avoid iOS-only UI
  assumptions; validate changed UI on both the Expo web build and iOS when
  available.

## Game and data invariants

These rules protect the fairness of the game:

- A comparison pair always comes from one category.
- Every item in a category uses exactly the same comparable metric and unit.
- Pairing must reject unfair near-ties using the documented ratio guard.
- Difficulty should follow the documented ratio-band curve, widening safely if
  no suitable candidate exists so the game cannot deadlock.
- Prevent immediate repeats and use run-local seen-item tracking.
- Preserve data provenance: include source and update metadata where the
  schema supports it. Do not add scraped or licensed data without confirming
  rights to bundle and distribute it.
- Treat source data as content, not incidental constants: validate it when
  loaded and write tests for malformed or inconsistent data.

## Project-specific completion

1. Add or update focused tests whenever pure game/data behaviour changes.
2. Run the narrowest relevant verification first, then the project check when
   the standard above requires it.
3. Classify documentation impact while the implementation context is fresh:
   behavior → `CHANGELOG.md`; built-system/workflow behavior →
   `HOW-IT-WORKS.md`; stack/tooling decisions → `STACK.md`; game-design
   decisions → `BRAINSTORM.md`; visual identity → `docs/branding/`; task
   status/blockers → `ROADMAP.md` and Superthread; process changes →
   `WORKFLOW.md`.
4. Follow `docs/WORKFLOW.md` for branch, changelog, CI, content-pipeline, and
   release requirements.

Preserve decision and correction history by appending or superseding prior
rationale. `npm run check:docs` enforces the path-based minimum, but it cannot
infer semantic design or status changes; agent judgement remains required.

## Commands

Use the repository scripts rather than inventing alternate build flows:

```bash
npm run start       # Expo development server
npm run ios         # Expo iOS development server
npm run web         # Expo web development server
npm run typecheck   # TypeScript validation
npm test            # Vitest test suite
npm run check:docs  # changed-file documentation impact
npm run check       # documentation + typecheck + tests
npm run build:web   # static web export
```

The intended logic test runner is Vitest. If tests or test tooling are not yet
present, add them as part of the first game-logic implementation rather than
substituting an untested implementation.

## Security and repository hygiene

- Never read, print, commit, or copy values from `.env`. Use `.env.example` to
  understand required names.
- Never expose secrets through `EXPO_PUBLIC_*`; Expo embeds those values in the
  client bundle. Server/pipeline secrets stay out of app code.
- Do not commit generated build output, credentials, signing files, or
  `node_modules`. Keep `.gitignore` aligned if new tooling creates artifacts.
- Do not run destructive Git or filesystem commands to clean up someone else's
  work. Ask before removing ambiguous files.
- Avoid dependency additions by default. Justify each new dependency, prefer
  platform/core APIs where sufficient, and update the stack documentation for a
  lasting choice.

## UX and release bar

- The product goal is to create engaging word and comparison games that
  strengthen cognitive skills and pattern recognition through repeated play.
- The player-facing promise is: "Guess correctly, keep the streak alive, and
  beat your best score."
- The product is a quick, readable casual game: optimise for a clear comparison,
  fast feedback, and an obvious next action.
- The value-reveal moment is central to the game loop; do not reduce it to an
  invisible state update.
- Account for loading, empty, malformed-data, end-of-run, and small-screen
  states. Never leave a player at a dead end.
- Preserve accessible labels, readable contrast, and touch targets. Do not rely
  on colour alone for correct/incorrect feedback.
- V1 needs tangible native value for App Store review: offline play, haptics,
  and a native leaderboard are the documented direction. Treat external service
  integration as an explicit later step, not a placeholder implementation.

## Escalate instead of guessing when

- an **[OPEN]** game-design decision changes player-facing rules;
- a category's metric, source, or licensing is unclear;
- a change requires a backend, credentials, paid service, app-store account,
  production deployment, or user data collection;
- existing files contain overlapping uncommitted changes;
- tests expose a behaviour that conflicts with the documented design.

For all other work, make a reasonable, reversible, documented decision and
move the project forward.
