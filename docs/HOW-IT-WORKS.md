# How It Works

**Last updated:** 2026-08-22
**What this is:** the living explainer for the whole system, told as **end-to-end journeys** — from the user, down through every layer, and back to the user. Each step names the code that handles it, the logic behind it, and the risk it carries. When a workflow changes, this doc changes in the same PR.

Doc boundaries: [STACK.md](STACK.md) = *what we chose* (decision log) · [BRAINSTORM.md](BRAINSTORM.md) = *what we're designing* · [WORKFLOW.md](WORKFLOW.md) = *how we collaborate* · this doc = *how the built system behaves*. Decisions are referenced by STACK id (D-00x), never re-argued here.

Honesty tags — this doc never claims more than the repo delivers:
- **[BUILT]** — exists in the repo, tested where applicable.
- **[PLANNED]** — designed (see BRAINSTORM) but not yet implemented.

---

## Journey 1 — A player plays one round

What happens from the tap on the app icon to the "wrong! game over" screen, layer by layer, and back up to the player's eyes.

```
 PLAYER                    APP LAYER                       LOGIC LAYER                DATA
   │                          │                                │                       │
   │ taps icon                │                                │                       │
   ├─────────────────────────►│ load bundle + JSON             │                       │
   │                          ├───────────────────────────────────────────────────────►│ src/data/categories/*.json
   │ taps PLAY                │                                │                       │ (bundled at build time)
   ├─────────────────────────►│ init run (seed)                │                       │
   │                          ├───────────────────────────────►│ engine.newRun()       │
   │ sees two cards           │◄───────────────────────────────┤ selectNextPair()      │
   │◄─────────────────────────┤ render pair                    │  (band + guard)       │
   │ taps MORE                │                                │                       │
   ├─────────────────────────►│ dispatch {type:'guess'}        │                       │
   │                          ├───────────────────────────────►│ engine reducer:       │
   │                          │                                │  compare values,      │
   │                          │                                │  streak++ or end      │
   │ count-up reveal, haptic  │◄───────────────────────────────┤ new state             │
   │◄─────────────────────────┤ animate + render               │                       │
   │        ... loop until wrong ...                           │                       │
   │ game over: streak, best  │                                │                       │
   │◄─────────────────────────┤ persist best, offer share      │                       │
```

### Step by step

**1. Player opens the app.** [BUILT: shell only]
`index.ts` → [App.tsx](../App.tsx) renders. The app is a single Expo codebase shipping to iOS and web (D-002, D-006). Everything the game will ever show is already on the device: the data files in `src/data/categories/` were bundled at build time. **No network call happens — the game is fully playable offline** (D-004; also our App Store 4.2 evidence). Today this step shows a placeholder screen; home screen with Play + best streak is [PLANNED].

**2. Player taps PLAY.** [PLANNED — design in BRAINSTORM §4–5]
The UI dispatches `newRun` to the engine — a pure reducer `(state, action) => state` in `src/games/more-or-less/engine.ts`. The run gets an RNG **seed**: random for normal play, date-derived for a future daily-challenge mode where every player worldwide gets the same sequence. Logic: a seeded reducer means any run can be replayed exactly, in a test, in microseconds.

**3. The system picks what the player sees.** [BUILT: fairness + difficulty primitives · PLANNED: full selector]
`selectNextPair()` chooses two items from the same category using two rules that live in [pairing.ts](../src/games/more-or-less/pairing.ts) today:
- **Fairness guard** — `ratio < 1.15` pairs are never shown. Anything closer than 15% is a coin flip, and a coin flip feels like the game cheated.
- **Difficulty band** — `targetBandForStreak(streak)`: early rounds pair items ≥3x apart (obvious wins build confidence), narrowing to 1.15–1.5x past streak 20 (genuinely hard). A run gets an arc instead of flat randomness.
- Cross-category pairs are structurally impossible (`isFairPair` refuses them), and a `seenIds` set prevents repeats within a run [PLANNED].

**4. Player sees two cards and taps MORE or LESS.** [PLANNED]
Left card: name + revealed value. Right card: name + hidden value. Every number on screen traces to one snapshot row in the content pipeline (Journey 2) — the UI invents nothing.

**5. The system judges the guess.** [BUILT: comparison rule via ratio/guard · PLANNED: reducer]
The reducer compares the two bundled values. Note what "correct" means here: **B > A per the shipped snapshot from source X on date D** — never absolute truth. The fairness guard is what makes this honest: measurement noise smaller than 15% *cannot flip the answer of any question the player was actually asked*. Full correctness model: BRAINSTORM §11.

**6. The answer travels back up: reveal.** [PLANNED]
The hidden value counts up to its real number — the emotional beat of the whole game — then a haptic tap fires (`src/native/haptics.native.ts`; no-op on web via the `.web.ts` twin). Correct → streak++, winning card slides left, new challenger enters (carry-over chain — genre standard, still [OPEN] vs the reference game). Wrong → run over.

**7. Back to the player: game over.** [PLANNED]
Final streak, best streak (persisted locally; Game Center leaderboard later — also 4.2 evidence), the pair that ended the run, Play Again + Share. Loop closes: the share link is how the game markets itself.

---

## Journey 2 — A number's life: from keyword file to the player's screen and back

The player asked "does *sushi* have more searches than *pizza*?" — this is how those numbers got there, and how they get corrected.

```
 EDITOR (us)          PIPELINE                 SUPABASE               REPO / CI            PLAYER
    │                    │                        │                      │                   │
    │ author keywords    │                        │                      │                   │
    ├───────────────────►│ ingest: batch fetch    │                      │                   │
    │                    │ from source adapter    │                      │                   │
    │                    ├── sanity checks ──────►│ snapshot: pending/   │                   │
    │                    │   (missing, >10x swing)│ validated + flags    │                   │
    │ review flags ─────────────────────────────► │ mark validated       │                   │
    │                    │ export ───────────────►│ mark published       │                   │
    │                    │      └──► src/data/categories/*.json          │                   │
    │ commit + PR ──────────────────────────────────────────────────────►│ CI: types+tests   │
    │                    │                        │                      │ EAS build →       │
    │                    │                        │                      │ TestFlight →      │
    │                    │                        │                      │ App Store ───────►│ plays it
    │                    │                        │                      │                   │
    │◄─── stale data / wrong-feeling answer / new category idea ─────────────────────────────┤
    │ new snapshot → next release (loop repeats)  │                      │                   │
```

### Step by step

**1. We author terms.** [BUILT]
[pipeline/keywords/wikipedia-popularity.json](../pipeline/keywords/wikipedia-popularity.json): 50 items, each with a display label and the exact `term` sent to the pageviews source. Keeping them separate means UI polish never silently changes what was measured.

**2. Ingest fetches real numbers — in batches, long before any player sees them.** [BUILT]
`npm run pipeline:ingest` ([ingest.ts](../pipeline/ingest.ts)) pulls volumes through a **source adapter** in batches of 20. The shipped adapter is Wikimedia pageviews (`pipeline/sources/wikipedia.ts`); the mock remains available for deterministic checks, but the real path is no longer a one-file swap. The uncomfortable fact driving that design is now different: the v1 metric is monthly Wikipedia pageviews, not Google search volume.

**2b. The LLM referee cross-checks the numbers.** [BUILT — see [validator/README.md](../validator/README.md)]
Before values ship, each pair can be put to an LLM under a schema tight enough that it cannot answer with anything but the answer: `verdict` (3-way enum), `confidence` (3-way enum), and a 200-char `reasoning` used for audit only, never for any decision. Every pair is asked **twice — A-vs-B and B-vs-A** — because models favour whichever option comes first; if the two answers don't mirror each other, the judgement is discarded as position bias. We flag only when the LLM is *confident and contradicts our data*, because flagging low-confidence noise would bury a human in false positives.

**The boundary that makes this honest (D-010, D-014):** the LLM is a **referee, not a source**. It is never asked "how many searches does pizza get" — models invent absolute numbers with total confidence. It is only asked which of two terms is *more* popular in pageviews, a relative judgement they're genuinely good at. Numbers that reach players must come from the Wikimedia pageviews source (D-012), not the model.

**3. Validation gates the data.** [BUILT]
Every fetched value passes sanity checks *at write time*: missing/zero/non-finite → flagged; moved **>10x vs the previous published snapshot** → flagged (popularity rarely does that between runs; API glitches do). One clean batch = one **snapshot** row in Supabase marked `validated`; any flags hold it at `pending` for human review. The raw API response is stored untouched (`item_values.raw`) so every number the player ever sees is auditable back to its origin. Schema: [0001_init.sql](../supabase/migrations/0001_init.sql). Supabase is the content **factory** — the app never connects to it (D-007).

**4. Export produces what the app actually reads.** [BUILT]
`npm run pipeline:export` ([export-snapshot.ts](../pipeline/export-snapshot.ts)) takes the newest validated/published snapshot per category, **excludes flagged rows**, and writes `src/data/categories/<id>.json` with per-item `source` + `updatedAt`. The snapshot is marked `published`.

**5. The data ships like code.** [BUILT: CI · blocked on owner accounts: EAS]
The JSON diff goes up in a PR — **the diff is the content review**. CI (documentation impact + typecheck + tests) must pass ([ci.yml](../.github/workflows/ci.yml)). Merge → release ritual (WORKFLOW): changelog rollover, version bump, tag, `eas build` → `eas submit` → TestFlight → App Store. Web ships the same commit to Railway after CI passes (D-020).

**6. The player sees the number** — with its provenance ("Source: monthly Wikipedia pageviews, <month year>") [PLANNED], so the claim on screen is exactly the claim the data supports.

**7. And back: the correction loop.** [BUILT: pipeline side · ongoing]
Data ages (bundled = frozen until next release, accepted trade-off D-004). Refresh = re-run ingest (swing detection compares against the last published snapshot automatically) → export → PR → release. A wrong-feeling answer in playtesting starts at `item_values.raw` in Supabase and ends in either a corrected snapshot or a removed item. App Store review latency (days) is why validation happens *before* shipping, not after.

---

## Journey 3 — A code change keeps its documentation current

**1. The author classifies impact.** [BUILT]
The matrix in [WORKFLOW.md](WORKFLOW.md) maps behavior, system, stack, design,
task-status, and process changes to their canonical documents. Documentation is
written in the same change; no automation invents project history or decisions.

**2. Cursor checks once at completion.** [BUILT]
The project `stop` hook runs `.cursor/hooks/check-docs-on-stop.mjs`. It inspects
the final working-tree paths and asks the agent to continue only when a
path-based required document is absent. It does not run after every edit, so it
avoids repetitive agent loops and token cost.

**3. Local and CI checks enforce the same minimum.** [BUILT]
`npm run check:docs` uses `scripts/check-docs.mjs` locally and in GitHub Actions.
CI compares the complete pull-request diff to its base branch; the local check
also includes untracked files. A missing document fails with the exact file and
reason. Semantic changes such as a design decision or task-status update still
require human or agent judgement because file paths cannot prove intent.

---

## Journey 4 — Consented play becomes an improvement signal

**1. Analytics starts off.** [BUILT]
`src/analytics/client.ts` creates the PostHog client only when both public
client variables are present. The SDK defaults to opted out and disables person
profiles, lifecycle autocapture, remote flags, push capture, exceptions, and
session replay.

**2. The player decides.** [BUILT]
`AnalyticsConsentPrompt` explains the bounded anonymous data before capture.
The choice is stored in AsyncStorage and can be reviewed or revoked from the
drawer. Declining does not change gameplay, persistence, accounts, or offline
support.

**3. Typed boundaries observe behavior.** [BUILT]
`App.tsx` captures startup, screen, selection, completion, score, and
signed-in-status events. Game screens capture submit and outcome aggregates.
Storage modules report bounded failure categories through a pure no-op sink.
Reducers in `src/games/` remain deterministic and analytics-free.

**4. PostHog answers product questions.** [BUILT: dashboard definitions]
The event dictionary in `docs/OBSERVABILITY.md` feeds product-health,
game-balance, and reliability dashboards. No email, username, account id,
guessed word, item label, URL, raw error, or persisted state is sent.
Operational deployment and content gates remain in Railway and GitHub Actions.

---

## System reference

Quick map of where each journey step lives:

| Piece | Where | Status |
|---|---|---|
| App shell (iOS + web) | `App.tsx`, `index.ts`, `app.json` | [BUILT: placeholder] |
| Fairness guard + difficulty bands | `src/games/more-or-less/pairing.ts` (+ 9 tests) | [BUILT] |
| Engine reducer, pair selector, scoring | `src/games/more-or-less/engine.ts` *(to create)* | [PLANNED] |
| Bundled game data | `src/data/categories/*.json` | [BUILT: dir, populated on first export] |
| Keyword lists | `pipeline/keywords/` | [BUILT] |
| Ingest + validation | `pipeline/ingest.ts` | [BUILT] |
| Source adapters | `pipeline/sources/` (Wikipedia active; mock available for deterministic checks) | [BUILT] |
| Export | `pipeline/export-snapshot.ts` | [BUILT] |
| LLM validator (schema/API/CLI) | `validator/` (+ 18 tests) | [BUILT] |
| DB schema | `supabase/migrations/0001_init.sql` | [BUILT: not yet applied — owner checklist] |
| CI | `.github/workflows/ci.yml` | [BUILT] |
| Documentation drift guard | `scripts/check-docs.mjs`, `.cursor/hooks/check-docs-on-stop.mjs` | [BUILT] |
| Consent and product analytics | `src/analytics/`, `src/ui/AnalyticsConsentPrompt.tsx` | [BUILT] |
| EAS build/submit profiles | `eas.json` | [BUILT: needs Expo login + Apple Developer] |
| Haptics / Game Center | `src/native/` | [PLANNED] |

## Security model

- `.env` gitignored + untracked; shape in `.env.example` (names only). History clean — the one committed `.env` was empty.
- `SUPABASE_SECRET_KEY`: pipeline-only, loaded via `tsx --env-file=.env`. Never `EXPO_PUBLIC_`-prefixed — Expo embeds those in the shipped bundle.
- Client bundles contain only publishable Supabase and PostHog project
  configuration under `EXPO_PUBLIC_*`; neither grants privileged server access.
- Supabase access is constrained by Row Level Security. PostHog remains opted
  out until explicit consent and never receives account identity.

## Risk register (live)

| Risk | Severity | Mitigation | Status |
|---|---|---|---|
| Metric source confusion | Low | Wikimedia pageviews is v1; future keyword APIs remain optional later upgrades | Closed |
| Guideline 4.2 rejection (app too thin) | Medium | Haptics + Game Center + offline before submission | Planned |
| Difficulty bands feel wrong | Medium | Constants isolated in `pairing.ts`; tune via playtest | Open |
| Stale bundled data | Medium | Per-item `updatedAt`; swing check on refresh; revisit D-004 if painful | Accepted |
| Core mechanic unverified vs reference game | Medium | BRAINSTORM [OPEN] items; engine takes them as config | Open |
| Secret leakage | High | Security model above; rotate keys if in doubt | Mitigated |

## Updating this doc

- New system/workflow → extend the journey it belongs to (or add a journey), in the same PR that builds it.
- A [PLANNED] step lands → flip its tag to [BUILT] and correct the description to match reality.
- Behavior changes → update the step; if the *decision* changed, log it in STACK first and reference the D-id.
- Retired pieces get struck through with a pointer to the replacement — never silently deleted.
