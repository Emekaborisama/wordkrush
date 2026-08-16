# Way of Working

**Last updated:** 2026-08-16
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

## Development loop

1. Branch off `master`: `feat/<slug>`, `fix/<slug>`, `data/<slug>`, `docs/<slug>`.
2. Make the change. Game logic goes in `src/game/` — **pure TS, no React/RN/Supabase imports**, with tests.
3. `npm run check` (typecheck + tests) must pass locally.
4. Update CHANGELOG [Unreleased]; update STACK/BRAINSTORM if a decision changed; keep the matching Superthread card and ROADMAP in sync.
5. PR to `master`. CI must be green. Merge.

Definition of done: code + tests + `npm run check` green + changelog line + docs updated.

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
npm run check        # what CI runs
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
4. Web: `npm run build:web` → deploy `dist/` (host TBD, STACK O-6).

## Security rules (non-negotiable)

- `.env` is gitignored and must stay untracked. New secrets → add the *name* to `.env.example`, never the value.
- `SUPABASE_SECRET_KEY` is pipeline/server-side only. **Never** give a secret an `EXPO_PUBLIC_` prefix — Expo embeds those in the shipped client bundle.
- CI/EAS secrets go in GitHub/EAS secret stores, not in files.

## One-time human setup (blocked on the owner, not on code)

- [ ] `npx expo login` (Expo account, for EAS builds)
- [ ] Apple Developer Program ($99/yr) + `eas credentials` once
- [ ] Apply `supabase/migrations/0001_init.sql` in the Supabase SQL editor
- [ ] Choose web host (STACK O-6) and connect repo
- [ ] Pick the real data source (STACK O-2) and fund it if paid
