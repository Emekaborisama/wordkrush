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

**7. Back to the player: game over.** [BUILT]
The run is written to the local board first (`src/scores/storage.ts`). Game over shows the streak, the pair that ended it, and Play Again / scores / all-games. Scores open a two-tab surface: **On this device** is the offline history; **Global** is each signed-in player's best run for that game (Journey 5). Game Center remains a later native 4.2 extra, not this board.

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
    │ commit + PR ──────────────────────────────────────────────────────►│ CI: check+export  │
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
The JSON diff goes up in a PR — **the diff is the content review**. CI must pass documentation impact, typecheck, tests, and `npm run build:web` ([ci.yml](../.github/workflows/ci.yml)). Merge → release ritual (WORKFLOW): changelog rollover, version bump, tag, `eas build` → `eas submit` → TestFlight → App Store. Web ships the same commit to Railway after both `check` and `web` pass (D-020, D-029).

**6. The player sees the number** — with its provenance ("Source: monthly Wikipedia pageviews, <month year>") [PLANNED], so the claim on screen is exactly the claim the data supports.

**7. Weekly rotation keeps the snapshot from freezing.** [BUILT]
Monday 09:00 UTC (and `workflow_dispatch`) GitHub Action [wikipedia-popularity-weekly.yml](../.github/workflows/wikipedia-popularity-weekly.yml) runs `npm run pipeline:rotate`. That job uses the same builder as `pipeline:preview` — Wikimedia pageviews plus freely-licensed images — because the factory ingest→export path is still blocked on the 0001 migration. It compares the new file to the bundled JSON and **skips the PR** when only `updatedAt` would change (most weeks of a month share one complete-month window). A material change writes the JSON, appends a changelog line, runs `npm run check`, and opens a PR on the standing branch `content/wikipedia-popularity-weekly`. Swings >10x vs the currently shipped values are listed on the PR; a human merges. The job never pushes to `master` and never fetches at play time (D-004, D-036). Output stays `provisional: true` until ST-35 lands.

**8. And back: the correction loop.** [BUILT: pipeline side · ongoing]
Data ages (bundled = frozen until next release, accepted trade-off D-004). Refresh = weekly rotate, or a manual `pipeline:preview` / ingest→export. A wrong-feeling answer in playtesting starts at the JSON diff (or `item_values.raw` once the factory path is live) and ends in either a corrected snapshot or a removed item. App Store review latency (days) is why validation happens *before* shipping, not after.

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
CI also runs `npm run build:web` in a sibling job; merge and Railway deploy
wait for both `check` and `web` (D-029). The export is not part of the local
`npm run check` loop.

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

## Journey 5 — A finished run becomes a local score and, optionally, a global rank

Local history and the global board are two surfaces over the same finished run.
They are never mixed into one list: game units differ, guests must keep a
score without an account, and a network failure must not erase a run that
already happened.

```
 PLAYER                 APP                         LOCAL STORE              SUPABASE
   │                      │                              │                      │
   │ run ends             │                              │                      │
   ├─────────────────────►│ recordScore(gameId, entry)   │                      │
   │                      ├─────────────────────────────►│ AsyncStorage board   │
   │ sees game-over       │◄─────────────────────────────┤ authoritative        │
   │ opens Scores         │                              │                      │
   ├─────────────────────►│ tab: On this device          │                      │
   │ local top 10         │◄─────────────────────────────┤ topScores()          │
   │                      │                              │                      │
   │ tab: Global          │ loadGlobalLeaderboard()      │                      │
   │                      ├────────────────────────────────────────────────────►│ view global_leaderboard
   │                      │                              │                      │
   │ signed in + pending  │ syncPendingScores()          │                      │
   │                      ├─────────────────────────────►│ mark synced          │
   │                      ├────────────────────────────────────────────────────►│ upsert global_scores
```

### Step by step

**1. The device is the source of truth.** [BUILT]
`recordScore` in [storage.ts](../src/scores/storage.ts) appends the run to a
per-game AsyncStorage board (`bestgames.scores.<gameId>.v1`). The write is
offline, needs no account, and is what the hub, home, and game-over screens
read. A global upload copies FROM this board; it never overwrites it (D-016,
D-025).

**2. Scores has two tabs.** [BUILT]
[ScoresScreen.tsx](../src/ui/screens/ScoresScreen.tsx) defaults to **Global**
when the publishable Supabase client is configured, otherwise **On this
device**. Local shows this device's top runs with the just-finished row
highlighted. Global shows each player's single best for that `game_id`, ranked
in SQL so Clueless (fewer guesses wins) does not share a sort with streak or
points games.

**3. Guests keep playing; sign-in unlocks posting.** [BUILT]
Without an account the local tab still works. The global tab is readable by
anyone when the backend is configured; posting requires a session. Opening
Scores while signed in is the retry boundary: `syncPendingScores` upserts
unsynced rows to `global_scores` keyed by `(player_id, client_entry_id)` so a
flaky retry cannot double-post, then marks only confirmed rows `synced`.
Optional accounts use **Supabase Auth** (D-033, D-037): an email magic link, no
password. The player enters an address, Supabase sends the link, and the
session lands when they open it (web URL parse, or native PKCE exchange from
`wordkrush://` / Expo Go) or type the 6-digit code from the same email. The
auth screen is email-only — there is no phone tab. Create-account still
collects a leaderboard username. That name is public identity, not a login:
[0004_unique_username.sql](../supabase/migrations/0004_unique_username.sql)
adds `username_key()` (trim, collapse spaces, lower-case — same as the
client `normalizeUsername` then `.toLowerCase()`) and a unique index on
`players.display_name`, so two accounts cannot post as the same name. A
duplicate is mapped to "That username is taken. Try another." on the username
field, not a generic form error. Web `emailRedirectTo` is the current origin,
produced by
`webAuthRedirectUrl` in [redirect-url.ts](../src/auth/redirect-url.ts). That
helper prefixes `https://` when the value has no scheme — GoTrue treats a
bare `wordkrush.com` as the path `/wordkrush.com` on the Auth API host and
returns `requested path is invalid`. The origin has no `/auth/callback`
suffix so it matches Site URL even when the dashboard allow-list is exact.
Hosted **Site URL** must be `https://wordkrush.com`. The player-facing Magic
Link HTML is [magic-link.html](../supabase/templates/magic-link.html): the
button is `{{ .ConfirmationURL }}` (never `{{ .SiteURL }}`, which is the
dashboard Site URL, not the one-time link) and the 6-digit `{{ .Token }}`
stays as the in-app fallback. This free project cannot save that template
until custom SMTP is configured (dashboard only; credentials never enter the
app). Skip remains a guest path; a missing backend still plays offline.

**4. The public board is a view, not a client-ranked dump.** [BUILT]
[0003_global_scores.sql](../supabase/migrations/0003_global_scores.sql) stores
immutable submissions (RLS: read non-rejected, insert only `auth.uid() =
player_id`, no client update/delete). `global_leaderboard` returns one best
row per player per game plus `global_rank`. [global.ts](../src/scores/global.ts)
parses that shape and drops anything malformed. If the client is unconfigured
or the request fails, the empty/error state says so and the local tab is
unchanged.

**5. Fonts and chrome load before the hub.** [BUILT]
`App.tsx` waits on bundled Fredoka faces (`@expo-google-fonts/fredoka` via the
`expo-font` plugin in `app.json`) so WordKrush type is available offline
(D-030). Symbol glyphs stay on the system face. Game data remains bundled
JSON; missing Supabase keys still leave every title playable. Splash uses the
black lockup in `assets/logo/`; auth uses the clear lockup; drawer and top bar
use the W mark via `BrandArtwork`. The hub hero is the little-deer mascot
(`src/ui/lottie/Mascot.tsx`, pose `idle`). Outcome screens reuse the same
component with `celebrate` or `wince` (More or Less game over, Wordfall
level result, Clueless solved). Clip URLs live in `LOTTIE_CLIPS`; deer poses
currently share one lottie.host file and fall back to bundled
`assets/lottie/deer.lottie` (D-032). Reduce-motion skips playback.

---

## Journey 6 — A Wordfall level goes live on Monday

The player-facing promise is one new Wordfall level each week. Nothing is
downloaded on Monday. The row has to already be in the installed bundle
(D-004, D-027). Full contract: [WORDFALL-WEEKLY.md](WORDFALL-WEEKLY.md).

```
 AUTHOR                 GIT / CI                    PLAYER DEVICE
   │                       │                              │
   │ append LEVELS row     │                              │
   │ availableFrom=Monday  │                              │
   ├──────────────────────►│ PR → check + web             │
   │                       │ merge master                 │
   │                       ├─ Railway deploy (web)        │
   │                       ├─ later: EAS / App Store      │
   │                       │                              │
   │                       │         Monday local 00:00   │
   │                       │         isLevelReleased true │
   │                       │                              │
   │                       │                              │ picker: “this week”
   │                       │                              │ playable if unlocked
```

**1. We author into the catalog, not a CMS.** [BUILT: file + agent loop · PLANNED: Job A cron]
A new object is appended to [levels.ts](../src/data/wordfall/levels.ts). Levels
1–11 omit `availableFrom` so the tutorial is live on day one. Weekly rows start
at 12 and set `availableFrom` to that Monday. The file *is* the schedule;
automation must read it rather than keep a second calendar. Working title
**Gauntlet**. Each drop's `taskFingerprint` (puzzle vs race plus objective
kinds) must be unique, including vs last week. Featured TTL is seven days
(`isNewestRelease`); the row stays after Sunday so campaign numbering has no
holes. Job B is the Cursor skill
[wordfall-weekly-gauntlet](../.cursor/skills/wordfall-weekly-gauntlet/SKILL.md).

**2. Local production check, then the row ships like code.** [BUILT: web · blocked on owner: iOS]
Before GitHub, Job B runs `npm run check`, `npm run build:web`, and
`npm run serve:web` (port 8080) and playtests that export (D-038). Merge to
`master` deploys web (D-020, D-029). iOS only sees the row after a store build
that contains it is installed. That is why the weekly spec keeps a buffer of
unpublished Mondays in the same catalog.

**3. Monday unlocks locally.** [BUILT]
[schedule.ts](../src/games/wordfall/schedule.ts) compares the player's local
calendar day to `availableFrom`. The picker shows “this week” / “drops …” /
locked. Playable still requires beating the previous level. Winning level N
unlocks N+1 even if that row has not shipped yet, so a later drop does not
force a replay.

**4. A stale app has no next week.** [BUILT]
A client missing the row cannot fetch it. Copy falls back to “come back next
week” when this build has no future `availableFrom`. That is the accepted
D-004 trade: content updates are releases.

---

## System reference

Quick map of where each journey step lives:

| Piece | Where | Status |
|---|---|---|
| App shell (iOS + web) | `App.tsx`, `index.ts`, `app.json` | [BUILT] — WordKrush hub, lockup splash `#0A0817`, `expo-font`; web at wordKrush.com |
| Brand kit | `assets/logo/`, `docs/branding/`, `BrandArtwork` | [BUILT] — black lockup on splash; clear lockup on auth/Android; W mark on icon, drawer, top bar |
| Mascot (deer) | `src/ui/lottie/`, `LOTTIE_CLIPS`, `assets/lottie/deer.lottie` | [BUILT] — hub + outcome poses; flame/burst CDN rows empty (D-032) |
| Display type | `@expo-google-fonts/fredoka`, `src/ui/theme.ts` | [BUILT] — every text tier, all three games; symbol glyphs stay on the system face (D-030) |
| Fairness guard + difficulty bands | `src/games/more-or-less/pairing.ts` (+ 9 tests) | [BUILT] |
| Engine reducer, pair selector, scoring | `src/games/more-or-less/engine.ts` | [BUILT] |
| Bundled game data | `src/data/categories/*.json` | [BUILT: dir, populated on first export] |
| Keyword lists | `pipeline/keywords/` | [BUILT] |
| Ingest + validation | `pipeline/ingest.ts` | [BUILT] |
| Local AI test player | `pipeline/ensure-test-player.ts` | [BUILT] — `TEST_PLAYER_*` in `.env` only; `npm run auth:ensure-test-player` (D-035) |
| Source adapters | `pipeline/sources/` (Wikipedia active; mock available for deterministic checks) | [BUILT] |
| Export | `pipeline/export-snapshot.ts` | [BUILT] |
| LLM validator (schema/API/CLI) | `validator/` (+ 18 tests) | [BUILT] |
| Content DB schema | `supabase/migrations/0001_init.sql` | [BUILT: apply on the owner project] |
| Accounts + first leaderboard tables | `supabase/migrations/0002_leaderboard.sql` | [BUILT: apply on the owner project] |
| Optional auth (email magic link) | `src/auth/` (`redirect-url.ts` `webAuthRedirectUrl`), `src/ui/screens/AuthScreen.tsx`, `supabase/templates/magic-link.html` | [BUILT] — email-only magic link; unique username; web origin (scheme required) / native deep-link restore. Template keeps `{{ .ConfirmationURL }}` + `{{ .Token }}`. Custom SMTP required to save it on this free project (D-033, D-037) |
| Unique leaderboard username | `supabase/migrations/0004_unique_username.sql`, `src/auth/validation.ts` `usernameKey` | [BUILT: apply on the owner project] — unique index on `username_key(display_name)`; duplicate maps to "That username is taken." |
| Cross-game global board | `supabase/migrations/0003_global_scores.sql`, `src/scores/global.ts` | [BUILT] |
| Local scores | `src/scores/storage.ts`, `src/scores/types.ts` | [BUILT] |
| Scores UI (global + local tabs) | `src/ui/screens/ScoresScreen.tsx` | [BUILT] |
| CI | `.github/workflows/ci.yml` | [BUILT] — `check` (docs + typecheck + tests) and `web` (`build:web`) in parallel; deploy waits for both |
| Wikipedia popularity weekly | `.github/workflows/wikipedia-popularity-weekly.yml`, `pipeline/rotate-wikipedia-popularity.ts` | [BUILT] — Monday 09:00 UTC + `workflow_dispatch`; PR on `content/wikipedia-popularity-weekly`, never `master` (D-036) |
| CI | `.github/workflows/ci.yml` | [BUILT] — `check` (docs + typecheck + tests) and `web` (`build:web`) in parallel; deploy waits for both, then `railway up --service wordcrush` |
| Web host | `railway.json`, `server/serve.mjs` | [BUILT] — Nixpacks runs `CI=true npm run build:web` on service `wordcrush`; `serve.mjs` listens on `$PORT` |
| Web favicon | `assets/favicon.png`, `assets/apple-touch-icon.png`, `scripts/patch-web-head.mjs` | [BUILT] — tight crop of the W tile; PNG + apple-touch-icon copied into `dist/` with a cache-busted `<link rel="icon">` |
| Documentation drift guard | `scripts/check-docs.mjs`, `.cursor/hooks/check-docs-on-stop.mjs` | [BUILT] |
| Consent and product analytics | `src/analytics/`, `src/ui/AnalyticsConsentPrompt.tsx` | [BUILT] |
| EAS build/submit profiles | `eas.json` | [BUILT: needs Expo login + Apple Developer] |
| Haptics | `src/native/haptics.ts` | [BUILT] |
| Wordfall weekly drops | `src/games/wordfall/schedule.ts` (`taskFingerprint`), `src/data/wordfall/levels.ts`, [WORDFALL-WEEKLY.md](WORDFALL-WEEKLY.md), `.cursor/skills/wordfall-weekly-gauntlet/` | [BUILT] gate + unique-task + local `serve:web` before GitHub (D-038); [PLANNED] Job A cron — Monday `availableFrom`; launch set has no date |
| Game Center | `src/native/` | [PLANNED] |

## Security model

- `.env` gitignored + untracked; shape in `.env.example` (names only). History clean — the one committed `.env` was empty.
- `SUPABASE_SECRET_KEY`: pipeline-only, loaded via `tsx --env-file=.env`. Never `EXPO_PUBLIC_`-prefixed — Expo embeds those in the shipped bundle.
- Client bundles contain only publishable Supabase and PostHog project
  configuration under `EXPO_PUBLIC_*`; neither grants privileged server access.
- Supabase access is constrained by Row Level Security (`players`,
  `leaderboard_entries`, `global_scores`). Clients insert only their own rows
  and cannot update or delete a submitted score. PostHog remains opted out
  until explicit consent and never receives account identity.

## Risk register (live)

| Risk | Severity | Mitigation | Status |
|---|---|---|---|
| Metric source confusion | Low | Wikimedia pageviews is v1; future keyword APIs remain optional later upgrades | Closed |
| Guideline 4.2 rejection (app too thin) | Medium | Offline play and haptics ship; Game Center still planned. Supabase global ranks are web+iOS, not a native Game Center substitute | Open |
| Difficulty bands feel wrong | Medium | Constants isolated in `pairing.ts`; tune via playtest | Open |
| Stale bundled data | Medium | Per-item `updatedAt`; weekly rotate PR; swing check on refresh; revisit D-004 if painful | Accepted |
| Core mechanic unverified vs reference game | Medium | BRAINSTORM [OPEN] items; engine takes them as config | Open |
| Secret leakage | High | Security model above; rotate keys if in doubt | Mitigated |

## Updating this doc

- New system/workflow → extend the journey it belongs to (or add a journey), in the same PR that builds it.
- A [PLANNED] step lands → flip its tag to [BUILT] and correct the description to match reality.
- Behavior changes → update the step; if the *decision* changed, log it in STACK first and reference the D-id.
- Retired pieces get struck through with a pointer to the replacement — never silently deleted.
