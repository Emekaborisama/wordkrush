# Way of Working

**Last updated:** 2026-08-30
For every collaborator on this repo — human or LLM. Read this before touching code.

## The docs are the shared brain

| Doc | What lives there | Update when |
|---|---|---|
| [HOW-IT-WORKS.md](HOW-IT-WORKS.md) | How each built system works: workflow, logic, risks | Same PR as any system/workflow change |
| [ROADMAP.md](ROADMAP.md) | Task breakdown, blockers, ordering, and the card contract (mirrors the Superthread *BestGame* board) | When work is planned, started, or finished |
| [STACK.md](STACK.md) | Tech choices + decision log | Any stack/tooling change |
| [BRAINSTORM.md](BRAINSTORM.md) | Game design, assumptions, corrections | Any design change or confirmed assumption |
| [branding/](branding/README.md) | Name, logo use, brand colour | Identity, lockup, or palette changes |
| [CHANGELOG.md](CHANGELOG.md) | What shipped, one `x.y.z` per PR | Every PR — new version heading, never an in-place edit |
| [AGENT-OS.md](AGENT-OS.md) | Agent fleet operating contract: bot catalog, skills, triggers, caps, stops | Bot skill, schedule, or contract change |
| [WORDFALL-WEEKLY.md](WORDFALL-WEEKLY.md) | Monday Wordfall drops: catalog, buffer, authoring, automation contract | Cadence, schedule gate, or weekly-release automation |
| [CLUELESS-DAILY.md](CLUELESS-DAILY.md) | Completion-gated Daily Vault content, buffer, and review-PR authoring contract | Clueless path, content cadence, or daily authoring automation |
| [reddit/README.md](../reddit/README.md) | The Devvit build of More or Less: shared-engine boundary, server-owned run, daily post, launch checklist (parked) | Anything under `reddit/` |
| WORKFLOW.md (this) | How we collaborate | Process changes |

Decisions get **logged, never silently rewritten** — supersede old entries so the reasoning trail survives. If you're an LLM picking this repo up cold: read HOW-IT-WORKS → STACK → BRAINSTORM → CHANGELOG (latest version), in that order, before writing code.

Documentation is updated in the same change while its context is fresh. The
project stop hook checks once when an agent finishes, and `npm run check:docs`
runs locally and in CI. These checks detect a path-based minimum; they never
generate prose and do not replace judgement about design decisions or task
status. A version-only bump of `package.json` / `app.json` (the D-041 changelog
process) requires `CHANGELOG.md` and does not require HOW-IT-WORKS or STACK.
Any other edit to those manifests still does.

Documentation impact:
- Player-visible or runtime behavior → `CHANGELOG.md`.
- Built-system, pipeline, infrastructure, or workflow behavior → `HOW-IT-WORKS.md`.
- Stack, dependency, build, deployment, or CI decisions → `STACK.md`.
- Game-design decisions or resolved assumptions → `BRAINSTORM.md`.
- Visual identity, logo, or brand colour → `docs/branding/`.
- Task status or blockers → `ROADMAP.md` and the matching Superthread card.
- Collaboration or release process → `WORKFLOW.md`.
- Agent fleet operating contract, bot skill, schedule, caps, stops → `AGENT-OS.md`.
- Wordfall Monday drops or their automation → `WORDFALL-WEEKLY.md`.
- Clueless daily path or vault authoring → `CLUELESS-DAILY.md`.

## Branches and pull requests (non-negotiable)

Every feature and every fix ships as a pull request. Never commit or push a feature or fix straight to `master`. Docs-only work still prefers a PR.

**Branch name comes from Superthread.** Before writing code, open the task card and use its git branch name — the card's `suggested_branch_name` / **Copy git branch name** value. Push that same name. Do not invent a `feat/<slug>` that is not the card's branch. The card ID in that name is what links the branch and PR back to the board.

If the card has no suggested name yet, still include the card ID in the branch (e.g. `ST-123-short-title`) so Superthread can link it. Include the card ID in the PR title as well.

**Stacked PRs are allowed.** A follow-on task may branch from an unmerged parent and open a PR against that parent instead of `master`. Each stacked PR still uses its own Superthread card's branch name and states the parent PR in the description.

**Recurring content exceptions.** The documented content loops
`content/wikipedia-popularity-weekly`, `content/clueless-daily`, and
`content/wordfall-weekly` deliberately use a standing content branch and PR
instead of a card per content item. They are limited automation exceptions to
the branch-name rule. Wikipedia keeps human review and never auto-merges.
Clueless and Wordfall bots (Grok Automations + `.cursor/skills/`, catalogued
in `docs/AGENT-OS.md`) use the `automation:auto-merge` label: the GitHub Action
marks eligible drafts ready, then merges only their named content branches
after a successful CI run for the current head. A bot does not replace CI, does
not push to master, and does not call EAS. Neither loop pushes directly to
`master` or bypasses a failed or pending check. All other work follows the
card-derived branch contract.

## Development loop

1. Read the Superthread card. Create or checkout its exact git branch name (`suggested_branch_name`).
2. Make the change. Put each game's logic in `src/games/<game-id>/` — **pure
   TS, no React/RN/Supabase imports**, with tests. Shared game infrastructure
   can live directly under `src/games/`.
3. `npm run check` (typecheck + tests) must pass locally.
4. Add a new CHANGELOG `[x.y.z] - date` section and bump `package.json` + `app.json` to that number. Do not append to a shipped version or keep an `[Unreleased]` bucket. Update STACK/BRAINSTORM if a decision changed; keep the matching Superthread card and ROADMAP in sync.
5. Open a PR from that Superthread branch (to `master`, or to the parent branch if stacked). Include the card ID in the PR title. CI must be green (`check` + `web`). Merge.

Definition of done: PR opened + code + tests + `npm run check` green + new changelog version + matching `package.json` / `app.json` bump + docs updated. CI also requires `npm run build:web`; that export stays off the local check so the daily loop stays fast.

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
npm run check        # documentation + typecheck + tests; CI runs this plus `build:web`
npm run auth:ensure-test-player  # create/refresh local TEST_PLAYER_* in .env (values not printed)
npm run email:weekly             # dry-run the Tuesday player Broadcast (add -- --send to actually send)

npm run reddit:install   # install the Devvit app's own dependency tree (once)
npm run reddit:types     # typecheck reddit/ — NOT part of `npm run check`
npm run reddit:dev       # devvit playtest against a test subreddit
```

## Content pipeline (offline, never at app runtime)

```bash
npm run pipeline:ingest   # keywords → source → validate → Supabase (needs .env)
npm run pipeline:export   # latest good snapshot → src/data/categories/*.json
npm run pipeline:preview  # Wikipedia pageviews + free-licence images → bundled JSON (no Supabase)
npm run pipeline:rotate   # re-measure shipped items; enqueue a new unused label round
npm run pipeline:reservoir # rebuild the Wikipedia keyword reservoir from Wikimedia tops
```

The app only ever reads the bundled JSON. Changing game data = run pipeline, commit the JSON diff, release. The JSON diff in the PR *is* the content review.

**Weekly Wikipedia popularity** is automated: `.github/workflows/wikipedia-popularity-weekly.yml` runs Mondays at 09:00 UTC (and on `workflow_dispatch`). It calls `pipeline:rotate`, which re-measures the bundled items and appends a new unused label round sampled from the reservoir, runs `npm run check` on a material change, and opens a PR on the standing branch `content/wikipedia-popularity-weekly`. That branch is an automation exception to the Superthread-name rule (D-036, D-052); do not merge it without reading the JSON diff. The job never pushes to `master` and never changes the set a player is currently on. Until the factory path is live (ST-35), the file stays `provisional: true`.

Wordfall weekly levels are a different path: append dated Monday rows to `src/data/wordfall/levels.ts`, then follow [WORDFALL-WEEKLY.md](WORDFALL-WEEKLY.md) Job B and the Cursor skill `.cursor/skills/wordfall-weekly-gauntlet/`. That loop maintains the four-week buffer through the standing `content/wordfall-weekly` PR, an automation exception to the Superthread-name rule (D-058, D-059, D-060), so it does not need a card per drop. Rows still require a unique `taskFingerprint`, a seven-day featured window, then **local** `npm run check` → `build:web` → `serve:web` and a picker playtest before `git push`. Applying `automation:auto-merge` marks an eligible draft ready; the GitHub Action merges it only after CI passes for the current head. Never push directly to `master`; do not run the Wikipedia ingest for a Wordfall drop. Monday does not fetch content; the catalog in git is the schedule.

Clueless Daily Vaults are a fourth content path: the player advances only after
their current level is solved and their next local midnight arrives. The
intended daily content authoring run is 18:00 GMT+1 and follows
[CLUELESS-DAILY.md](CLUELESS-DAILY.md) plus
`.cursor/skills/clueless-daily-path/`. It appends one cache-ranked future solo
level to the standing `content/clueless-daily` PR, never directly to `master`;
that standing content branch is an automation exception to the Superthread-name
rule (D-057, D-059, D-060). Applying `automation:auto-merge` marks an eligible
draft ready; the GitHub Action merges it only after CI succeeds for the current
head, never bypassing failed or pending checks. It does not call EAS or fetch
content at play time. Configure the final schedule in the Cursor Automations
editor; the committed skill alone does not create a live cron.

The **Reddit app** is a third path, and not the same thing as Reddit ads. [`reddit/`](../reddit/README.md) is a Devvit project with its own `package.json`, its own dependency tree, and its own TypeScript build (D-042). It imports `src/games/more-or-less/engine.ts` and `src/data/categories/` rather than copying them, so:

- Changing `src/games/more-or-less/` or `src/data/categories/` affects **both** surfaces. Run `npm run reddit:types` as well as `npm run check`.
- `npm run typecheck` deliberately skips `reddit/`; `npm test` deliberately includes `reddit/src/shared/**/*.test.ts`.
- Adding an import to the shared engine will fail `reddit:types` with TS6307 until `reddit/tools/tsconfig.shared.json` lists the new file. That is the boundary working, not a bug.
- There is no CI job for it yet. Until there is, `npm run reddit:types` before merging anything that touches the shared engine is a manual step.

Reddit ads are a different path again: drafts, the reuse ledger, and the link card live in [marketing/reddits/](marketing/reddits/README.md). The Cursor skill `.cursor/skills/reddit-ad-posts/` reads that ledger, checks each sub's rules in the browser, and only submits when the owner names the sub. No Reddit MCP. Do not invent a `docs/gtm/` tree — GTM strategy stays in [marketing/](marketing/README.md).

## Release process

1. The PR already is the version: new CHANGELOG `[x.y.z] - date` plus matching `package.json` / `app.json`. There is no separate roll-up PR.
2. Merge that PR to `master`. [release.yml](../.github/workflows/release.yml) publishes GitHub Release `vX.Y.Z` from the matching changelog section (`scripts/changelog-notes.mjs`). Pushing tag `vX.Y.Z` does the same. The job is idempotent: an existing tag/release is left alone. A master push whose `package.json` version has no changelog section is a no-op.
3. `eas build --platform ios --profile production` → `eas submit --platform ios` → TestFlight → App Store. Still a human step; blocked on Expo login and Apple Developer.
4. Web: nothing to do — merging to `master` deploys to Railway automatically once `check` and `web` are green (D-020, D-029). Public site: [wordKrush.com](https://wordkrush.com).

## Web deploys

Every push to `master` that passes `check` and the Expo web export deploys to Railway. There is no manual step in the normal path. Players reach the site at [wordKrush.com](https://wordkrush.com).

| Need | Command |
|---|---|
| Preview the production build locally | `npm run build:web && npm run serve:web` → http://localhost:8080 |
| Deploy from your machine (bypasses CI) | `railway up --service wordcrush` |
| Watch a deploy | `railway logs --service wordcrush` |
| Roll back | `railway down` (removes the most recent deployment) |
| Open the dashboard | `railway open` |

Build-time configuration lives in Railway, not in the repo. Only `EXPO_PUBLIC_*` variables reach the browser bundle, so the deployed app needs its own copies to enable accounts and the leaderboard:

```bash
railway variable set --service wordcrush EXPO_PUBLIC_SUPABASE_URL=...
railway variable set --service wordcrush EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
railway variable set --service wordcrush EXPO_PUBLIC_POSTHOG_KEY=...
railway variable set --service wordcrush EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

Without them the site still works — `isBackendConfigured` is false, and the game runs offline as guest. **Never import `.env` and never set `SUPABASE_SECRET_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `RESEND_API_KEY`, `SUPERTHREAD_API`, or `TEST_PLAYER_*` on this service**: Nixpacks bakes every service variable into the image as `ENV`, and this is a public client bundle. Set the four `EXPO_PUBLIC_*` names individually. `CI=true` is required so Expo's `getenv` does not crash on Railway's empty `CI`.

The PostHog project token is also public client configuration, not a secret.
Without it analytics is a no-op and no consent prompt appears. With it,
analytics still starts opted out and requires the player's explicit consent.

## Security rules (non-negotiable)

- `.env` is gitignored and must stay untracked. New secrets → add the *name* to `.env.example`, never the value.
- `TEST_PLAYER_*` is a confirmed local Auth user for agent API tests (`npm run auth:ensure-test-player`). It is not a service-role superuser. Agents may read those names from `.env` locally; they must not print the values, commit them, or put them on Railway/EAS/`EXPO_PUBLIC_*`.
- `SUPABASE_SECRET_KEY` is pipeline/server-side only. **Never** give a secret an `EXPO_PUBLIC_` prefix — Expo embeds those in the shipped client bundle.
- `RESEND_API_KEY` is pipeline/GitHub Environment `best-games` only (Tuesday player Broadcast, D-053 / D-054 / D-062). Never Railway, never `EXPO_PUBLIC_*`.
- `OPENAI_API_KEY` is validator-only (content referee). Never game runtime, never Railway, never `EXPO_PUBLIC_*`, never the Tuesday email job.
- `OPENROUTER_API_KEY` is pipeline/GitHub Environment `best-games` only (Tuesday email draft, D-062). Never game runtime, never Railway, never `EXPO_PUBLIC_*`.
- `CONTENT_AUTOMERGE_TOKEN` is a GitHub Actions secret only (D-059), never `.env`, Railway, or `EXPO_PUBLIC_*`. Use a fine-grained PAT or GitHub App token with Actions read plus Contents and Pull requests write so its merge event triggers the normal `master` workflows.
- CI/EAS secrets go in GitHub/EAS secret stores, not in files.

## One-time human setup (blocked on the owner, not on code)

- [ ] `npx expo login` (Expo account, for EAS builds)
- [ ] Apple Developer Program ($99/yr) + `eas credentials` once
- [ ] Apply `supabase/migrations/0001_init.sql`, `0002_leaderboard.sql`, `0003_global_scores.sql`, `0004_unique_username.sql`, `0005_clueless_difficulty_leaderboards.sql`, `0006_teams_and_live_matches.sql`, and `0007_team_crud.sql` in the Supabase SQL editor
- [ ] **Supabase Auth magic link (D-033):** Authentication → URL Configuration. Site URL must be exactly `https://wordkrush.com` (include `https://`; a bare `wordkrush.com` becomes the path `/wordkrush.com` on the API host). Redirect allow-list: `https://wordkrush.com/**`, `http://localhost:8081/**`, `http://localhost:8080/**`, `wordkrush://**`, `exp://**`. This free project cannot edit Auth email templates on the default mailer (June 2026). Enable custom SMTP only after a provider is ready — an empty host/user/pass breaks sending. Typical path is [Resend](https://resend.com/docs/send-with-supabase-smtp): verify `wordkrush.com`, then Host `smtp.resend.com`, Port `465`, Username `resend`, Password = Resend API key. Sender `noreply@wordkrush.com`, name `WordKrush`. Then Authentication → Email Templates → Magic Link: subject `Sign in to WordKrush`, body from `supabase/templates/magic-link.html` (keep `{{ .ConfirmationURL }}` and `{{ .Token }}`). SMTP credentials stay in the dashboard, never in `.env` or `EXPO_PUBLIC_*`. The Resend **API** key is a different secret: it is `RESEND_API_KEY` for Broadcasts (D-053), not the SMTP password.

- [ ] **Player email (D-062):** In Resend, verify `wordkrush.com` and keep sender `WordKrush <noreply@wordkrush.com>`. Put `RESEND_API_KEY` and `OPENROUTER_API_KEY` in `.env` (already named in `.env.example`). The same names live as GitHub **Environment** secrets on `best-games` (`RESEND_API_KEY`, `OPENROUTER_API_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`) — the Tuesday job sets `environment: best-games` so it can read them. Optional: `RESEND_FROM`, `RESEND_SEGMENT_ID`, `OPENROUTER_BASE_URL` (defaults to `https://openrouter.ai/api/v1`), `OPENROUTER_EMAIL_MODEL`. Then **Actions → Player email weekly → Run workflow** once with `dry_run` on. Tuesday 09:00 UTC cron takes it from there. A week with no player-facing changelog and no Wordfall drop sends nothing. The keys must never go on Railway. Do not add required reviewers on `best-games` or the cron will sit waiting for approval.

- [x] **Content PR auto-merge (D-059/D-060):** `CONTENT_AUTOMERGE_TOKEN` is configured as a fine-grained PAT with **Actions: read**, **Contents: read and write**, and **Pull requests: read and write**; PR #40 proved that its merge triggers normal `master` CI and release workflows. Applying `automation:auto-merge` now owns draft-to-ready. The current PAT expires on **2026-09-28** and must be rotated before then.

- [ ] **Reddit app (D-042):** `npm run reddit:install`, then `npm --prefix reddit run login` with the Reddit account that will own it. Playtest with `npm run reddit:dev` against a test subreddit, then `npm --prefix reddit run launch` for app review. **Pick the launch subreddit and talk to its moderators before installing** — an app dropped into a community that was not asked is a removal, not a launch. Confirm the 13:00 UTC cron hour suits that audience.

Web hosting and the v1 data source are resolved by STACK D-020 and D-012.
