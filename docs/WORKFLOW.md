# Way of Working

**Last updated:** 2026-08-22
For every collaborator on this repo — human or LLM. Read this before touching code.

## The docs are the shared brain

| Doc | What lives there | Update when |
|---|---|---|
| [HOW-IT-WORKS.md](HOW-IT-WORKS.md) | How each built system works: workflow, logic, risks | Same PR as any system/workflow change |
| [ROADMAP.md](ROADMAP.md) | Task breakdown, blockers, ordering, and the card contract (mirrors the Superthread *BestGame* board) | When work is planned, started, or finished |
| [STACK.md](STACK.md) | Tech choices + decision log | Any stack/tooling change |
| [BRAINSTORM.md](BRAINSTORM.md) | Game design, assumptions, corrections | Any design change or confirmed assumption |
| [CHANGELOG.md](CHANGELOG.md) | What shipped, per version | Every behavior-changing PR |
| WORKFLOW.md (this) | How we collaborate | Process changes |

Decisions get **logged, never silently rewritten** — supersede old entries so the reasoning trail survives. If you're an LLM picking this repo up cold: read HOW-IT-WORKS → STACK → BRAINSTORM → CHANGELOG [Unreleased], in that order, before writing code.

Documentation is updated in the same change while its context is fresh. The
project stop hook checks once when an agent finishes, and `npm run check:docs`
runs locally and in CI. These checks detect a path-based minimum; they never
generate prose and do not replace judgement about design decisions or task
status.

Documentation impact:
- Player-visible or runtime behavior → `CHANGELOG.md`.
- Built-system, pipeline, infrastructure, or workflow behavior → `HOW-IT-WORKS.md`.
- Stack, dependency, build, deployment, or CI decisions → `STACK.md`.
- Game-design decisions or resolved assumptions → `BRAINSTORM.md`.
- Task status or blockers → `ROADMAP.md` and the matching Superthread card.
- Collaboration or release process → `WORKFLOW.md`.

## Branches and pull requests (non-negotiable)

Every feature and every fix ships as a pull request. Never commit or push a feature or fix straight to `master`. Docs-only work still prefers a PR.

**Branch name comes from Superthread.** Before writing code, open the task card and use its git branch name — the card's `suggested_branch_name` / **Copy git branch name** value. Push that same name. Do not invent a `feat/<slug>` that is not the card's branch. The card ID in that name is what links the branch and PR back to the board.

If the card has no suggested name yet, still include the card ID in the branch (e.g. `ST-123-short-title`) so Superthread can link it. Include the card ID in the PR title as well.

**Stacked PRs are allowed.** A follow-on task may branch from an unmerged parent and open a PR against that parent instead of `master`. Each stacked PR still uses its own Superthread card's branch name and states the parent PR in the description.

## Development loop

1. Read the Superthread card. Create or checkout its exact git branch name (`suggested_branch_name`).
2. Make the change. Put each game's logic in `src/games/<game-id>/` — **pure
   TS, no React/RN/Supabase imports**, with tests. Shared game infrastructure
   can live directly under `src/games/`.
3. `npm run check` (typecheck + tests) must pass locally.
4. Update CHANGELOG [Unreleased]; update STACK/BRAINSTORM if a decision changed; keep the matching Superthread card and ROADMAP in sync.
5. Open a PR from that Superthread branch (to `master`, or to the parent branch if stacked). Include the card ID in the PR title. CI must be green. Merge.

Definition of done: PR opened + code + tests + `npm run check` green + changelog line + docs updated.

## Task card contract

Use the same shape on every Superthread card:

- Description: the outcome in one sentence.
- Context: why the work exists and which docs or decisions it depends on.
- Scope: what is included and what is explicitly out of scope.
- Acceptance criteria: the observable finish line.
- Verification: the exact checks or commands that prove it.
- Sign-off: who confirms it is ready to move.

Keep the board Kanban-style (`To do` → `Doing` → `Done`). Do not add sprint
ceremony unless the owner asks for it.

## Daily commands

```bash
npm run web          # instant browser loop — fastest way to see UI
npm start            # Expo dev server → scan QR with iPhone (Expo Go)
npm run test:watch   # logic TDD loop
npm run check:docs   # documentation impact for changed files
npm run check        # documentation + typecheck + tests; what CI runs
```

## Content pipeline (offline, never at app runtime)

```bash
npm run pipeline:ingest   # keywords → source (mock for now) → validate → Supabase
npm run pipeline:export   # latest good snapshot → src/data/categories/*.json
```

The app only ever reads the bundled JSON. Changing game data = run pipeline, commit the JSON diff, release. The JSON diff in the PR *is* the content review.

## Release process

1. Move CHANGELOG [Unreleased] → `[x.y.z] - date`; bump `package.json` + `app.json` versions.
2. Tag `vx.y.z`, push.
3. `eas build --platform ios --profile production` → `eas submit --platform ios` → TestFlight → App Store.
4. Web: nothing to do — merging to `master` deploys to Railway automatically once CI is green (D-020).

## Web deploys

Every push to `master` that passes `check` deploys to Railway. There is no manual step in the normal path.

| Need | Command |
|---|---|
| Preview the production build locally | `npm run build:web && npm run serve:web` → http://localhost:8080 |
| Deploy from your machine (bypasses CI) | `railway up --service web` |
| Watch a deploy | `railway logs --service web` |
| Roll back | `railway down` (removes the most recent deployment) |
| Open the dashboard | `railway open` |

Build-time configuration lives in Railway, not in the repo. Only `EXPO_PUBLIC_*` variables reach the browser bundle, so the deployed app needs its own copies to enable accounts and the leaderboard:

```bash
railway variable set --service web EXPO_PUBLIC_SUPABASE_URL=...
railway variable set --service web EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
railway variable set --service web EXPO_PUBLIC_POSTHOG_KEY=...
railway variable set --service web EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

Without them the site still works — `isBackendConfigured` is false, and the game runs offline as guest. **Never set `SUPABASE_SECRET_KEY` on this service**: it is a client bundle, and anything there is public.

The PostHog project token is also public client configuration, not a secret.
Without it analytics is a no-op and no consent prompt appears. With it,
analytics still starts opted out and requires the player's explicit consent.

## Security rules (non-negotiable)

- `.env` is gitignored and must stay untracked. New secrets → add the *name* to `.env.example`, never the value.
- `SUPABASE_SECRET_KEY` is pipeline/server-side only. **Never** give a secret an `EXPO_PUBLIC_` prefix — Expo embeds those in the shipped client bundle.
- CI/EAS secrets go in GitHub/EAS secret stores, not in files.

## One-time human setup (blocked on the owner, not on code)

- [ ] `npx expo login` (Expo account, for EAS builds)
- [ ] Apple Developer Program ($99/yr) + `eas credentials` once
- [ ] Apply `supabase/migrations/0001_init.sql` in the Supabase SQL editor

Web hosting and the v1 data source are resolved by STACK D-020 and D-012.
