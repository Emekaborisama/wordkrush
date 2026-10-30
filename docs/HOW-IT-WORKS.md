# How It Works

**Last updated:** 2026-08-30
**What this is:** the living explainer for the whole system, told as **end-to-end journeys** — from the user, down through every layer, and back to the user. Each step names the code that handles it, the logic behind it, and the risk it carries. When a workflow changes, this doc changes in the same PR.

Doc boundaries: [STACK.md](STACK.md) = *what we chose* (decision log) · [BRAINSTORM.md](BRAINSTORM.md) = *what we're designing* · [WORKFLOW.md](WORKFLOW.md) = *how we collaborate* · [marketing/](marketing/README.md) = *how we reach players* (GTM decision log, G-00x) · this doc = *how the built system behaves*. Decisions are referenced by STACK id (D-00x), never re-argued here.

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
The hidden value counts up to its real number — the emotional beat of the whole game — then the judgement's feedback fires: `feedback('correct')` or `feedback('wrong')`, which plays a clip and a haptic together (`src/native/feedback.ts`). The haptic half runs through the `haptics.ts` / `haptics.native.ts` twins — `expo-haptics` on native, the browser Vibration API on a capable touch device, nothing on Safari or a laptop (D-044); the clip plays everywhere. Correct → streak++, winning card slides left, new challenger enters (carry-over chain — genre standard, still [OPEN] vs the reference game). Wrong → run over.

**7. Back to the player: game over.** [BUILT]
The run is written to the local board first (`src/scores/storage.ts`). Game over shows the streak, the pair that ended it, Play Again / scores / all-games, and **Share result**. The share is a spoiler-free emoji grid from a pure formatter in `src/games/<id>/share.ts`; the platform twin in `src/native/share.ts` / `share.native.ts` offers the system sheet or copies to the clipboard. Clueless and Wordfall attach the same control to their in-place result cards. Solo More or Less also shows **rounds passed** and how many names remain in the current set. Scores open a two-tab surface: **On this device** is the offline history; **Global** is each signed-in player's best run for that game (Journey 5). Game Center remains a later native 4.2 extra, not this board.

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
[pipeline/keywords/wikipedia-popularity.json](../pipeline/keywords/wikipedia-popularity.json) is the original 50 — display `label` plus the exact `term` sent to the pageviews source. A much larger filtered list lives in [pipeline/keywords/wikipedia-popularity-reservoir.json](../pipeline/keywords/wikipedia-popularity-reservoir.json) (`npm run pipeline:reservoir`). Play never reads the reservoir. The bundled snapshot queues **label rounds** (`rounds[].itemIds`); solo More or Less plays only the player's current round until every name in it has been shown.
Since 0.11.0 there is one keyword file per **level label**: `wikipedia-music-stars`, `-hit-songs`, `-movies`, `-football-stars`, `-world-cities` and `-food`, plus seven `lagos-*` files for I Sabi Lagos. Each is built with `CATEGORY=<id> npx tsx pipeline/preview-category.ts` into `src/data/categories/<id>.json`. A `term` must be the canonical article, because pageviews are counted per exact title: a redirect or disambiguation page reads near zero or names something else. An optional `imageTerm` takes the photo from another article when the item itself has no freely licensed image, for example a song showing its artist. The label names that artist, so the photo stays honest. Only the Popularity snapshot (`DEFAULT_CATEGORY_ID`) is written with label rounds. The other categories are single-set levels.

**2. Ingest fetches real numbers — in batches, long before any player sees them.** [BUILT]
`npm run pipeline:ingest` ([ingest.ts](../pipeline/ingest.ts)) pulls volumes through a **source adapter** in batches of 20. The shipped adapter is Wikimedia pageviews (`pipeline/sources/wikipedia.ts`). Its pageview and image requests go through `politeFetch` (`pipeline/sources/politeFetch.ts`), which retries an HTTP 429 with backoff and honours `Retry-After`, so one rate-limited batch no longer aborts a build; the mock remains available for deterministic checks, but the real path is no longer a one-file swap. The uncomfortable fact driving that design is now different: the v1 metric is monthly Wikipedia pageviews, not Google search volume.

**2b. The LLM referee cross-checks the numbers.** [BUILT — see [validator/README.md](../validator/README.md)]
Before values ship, each pair can be put to an LLM under a schema tight enough that it cannot answer with anything but the answer: `verdict` (3-way enum), `confidence` (3-way enum), and a 200-char `reasoning` used for audit only, never for any decision. Every pair is asked **twice — A-vs-B and B-vs-A** — because models favour whichever option comes first; if the two answers don't mirror each other, the judgement is discarded as position bias. We flag only when the LLM is *confident and contradicts our data*, because flagging low-confidence noise would bury a human in false positives.

**The boundary that makes this honest (D-010, D-014):** the LLM is a **referee, not a source**. It is never asked "how many searches does pizza get" — models invent absolute numbers with total confidence. It is only asked which of two terms is *more* popular in pageviews, a relative judgement they're genuinely good at. Numbers that reach players must come from the Wikimedia pageviews source (D-012), not the model.

**3. Validation gates the data.** [BUILT]
Every fetched value passes sanity checks *at write time*: missing/zero/non-finite → flagged; moved **>10x vs the previous published snapshot** → flagged (popularity rarely does that between runs; API glitches do). One clean batch = one **snapshot** row in Supabase marked `validated`; any flags hold it at `pending` for human review. The raw API response is stored untouched (`item_values.raw`) so every number the player ever sees is auditable back to its origin. Schema: [0001_init.sql](../supabase/migrations/0001_init.sql). Supabase is the content **factory** — the app never connects to it (D-007).

**4. Export produces what the app actually reads.** [BUILT]
`npm run pipeline:export` ([export-snapshot.ts](../pipeline/export-snapshot.ts)) takes the newest validated/published snapshot per category, **excludes flagged rows**, and writes `src/data/categories/<id>.json` with per-item `source` + `updatedAt`. The snapshot is marked `published`.

**5. The data ships like code.** [BUILT: CI + GitHub Release · blocked on owner accounts: EAS]
The JSON diff goes up in a PR — **the diff is the content review**. CI must pass documentation impact, typecheck, tests, and `npm run build:web` ([ci.yml](../.github/workflows/ci.yml)). Every PR is a version bump; merge to `master` publishes GitHub Release `vX.Y.Z` from that section ([release.yml](../.github/workflows/release.yml), D-039, D-041). Native still needs the owner: `eas build` → `eas submit` → TestFlight → App Store. Web ships the same commit to Railway after both `check` and `web` pass (D-020, D-029).

**6. The player sees the number** — with its provenance ("Source: monthly Wikipedia pageviews, <month year>") [PLANNED], so the claim on screen is exactly the claim the data supports.

**7. Weekly rotation enqueues a new labelled set.** [BUILT]
Monday 09:00 UTC (and `workflow_dispatch`) GitHub Action [wikipedia-popularity-weekly.yml](../.github/workflows/wikipedia-popularity-weekly.yml) runs `npm run pipeline:rotate`. That job re-measures every item already in the snapshot (Wikimedia pageviews plus freely-licensed images — same builder as `pipeline:preview`) because the factory ingest→export path is still blocked on the 0001 migration. It then samples an unused round of about 25 playable articles from the reservoir and **appends** it. It does not swap the set a player is currently on; they stay until they exhaust it. Images prefer the article's free lead (`pageimages`); when that is a fair-use logo or screenshot and `pageimages` returns nothing, [wikipedia-images.ts](../pipeline/sources/wikipedia-images.ts) walks other files on the page and ships the first freely-licensed photograph. Fair-use files are still skipped. An author name that Commons nests twice is collapsed to one copy (`collapseDoubled`). A thrown fetch (Wikimedia 429, network) keeps the picture already in the bundled JSON rather than treating a blank as a content change. The job compares the new file to the bundled JSON and **skips the PR** when only `updatedAt` would change and no round was appended. A material change writes the JSON, bumps the patch version, adds a new changelog section, runs `npm run check`, and opens a PR on the standing branch `content/wikipedia-popularity-weekly`. The D-041 version bump of `package.json` / `app.json` is changelog, not a stack/system change (D-049), so that check can pass on a content-only rotate. Swings >10x vs the currently shipped values are listed on the PR; a human merges. The job never pushes to `master` and never fetches at play time (D-004, D-036, D-052). Output stays `provisional: true` until ST-35 lands.

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
reason. A D-041 version-only bump of `package.json` / `app.json` still requires
the changelog and does **not** require HOW-IT-WORKS or STACK (D-049); any other
edit to those manifests still does. Semantic changes such as a design decision
or task-status update still require human or agent judgement because file paths
cannot prove intent. CI also runs `npm run build:web` in a sibling job; merge
and Railway deploy wait for both `check` and `web` (D-029). The export is not
part of the local `npm run check` loop.

---

## Journey 4 — Consented play becomes an improvement signal

**1. Analytics starts off.** [BUILT]
`src/analytics/client.ts` creates the PostHog client only when both public
client variables are present. The SDK defaults to opted out and disables
lifecycle autocapture, remote flags, push capture, and session replay. Person
profiles are `identified_only`.

**2. The player decides.** [BUILT]
The `AccountScreen` explains that guests stay anonymous and that a
consented account is linked by id, username, and email. The choice is stored in
AsyncStorage (`wordkrush.analytics-consent.v2`) and can be reviewed or revoked
from the drawer. Declining does not change gameplay, persistence, accounts, or
offline support.

**3. Typed boundaries observe behavior.** [BUILT]
`App.tsx` captures startup, screen, selection, completion, score, and
signed-in-status events, and calls `identify` after a consented sign-up or
restored session. The first consented open also sends a bounded
`entry_source` (and UTM buckets when present) on `app_opened`; web arrivals
and non-auth deep links fire `landing_viewed`. Raw URLs stay out.
Game screens capture submit and outcome aggregates. Sign-out
resets the PostHog identity. Storage modules report bounded failure categories
through a pure no-op sink. Reducers in `src/games/` remain deterministic and
analytics-free.

**4. PostHog answers product questions.** [BUILT: dashboard definitions]
The event dictionary in `docs/OBSERVABILITY.md` feeds product-health,
game-balance, and reliability dashboards. Guessed words, item labels, URLs, raw
errors, and persisted state are never sent. Operational deployment and content
gates remain in Railway and GitHub Actions.

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
A row with `boosted: true` fails `needsGlobalSync`, so a boosted run is never
uploaded (D-065). It stays on the local board with a Boosted tag.
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

Player-facing weekly mail is not an Auth template — those only cover sign-in,
recovery, and invite. [player-email.ts](../pipeline/player-email.ts) reads
player-facing bullets from [CHANGELOG.md](CHANGELOG.md) (last 7 days; 14 in
`whats-new` mode) plus this week’s Wordfall drop, asks OpenRouter once for
player-voice copy from those facts, and skips the week when both are empty.
It lists confirmed Auth users with the secret key, upserts them into the
Resend segment `WordKrush players` (username → `first_name`, latest
`global_scores` row → custom property `game`), and creates one Broadcast
named `WordKrush weekly YYYY-MM-DD`. Merge tags
`{{{contact.first_name|there}}}` and `{{{game|the games}}}` personalize the
same HTML. A hero image is a real game picture, not the lockup: Wordfall key
art when a Monday drop is live, otherwise Clueless / More or Less art from
`assets/games/`, or a hub screenshot in `assets/email/hub.png`.
`scripts/patch-web-head.mjs` copies those files to `dist/email/` so Gmail can
load `https://wordkrush.com/email/<file>`. The Tuesday 09:00 UTC job
([player-email-weekly.yml](../.github/workflows/player-email-weekly.yml))
uses GitHub Environment `best-games`. The play button is
`https://wordkrush.com` with `utm_source=email` / `utm_medium=product-update`.
Resend’s `{{{RESEND_UNSUBSCRIBE_URL}}}` is the opt-out. Guests have no
address. `RESEND_API_KEY` and `OPENROUTER_API_KEY` are pipeline-only (D-062).
[whats-new.html](../supabase/templates/whats-new.html) is a branded one-off
shell, not the weekly send.

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
(D-030). Symbol glyphs stay on the system face. `TextField` sets Fredoka on
the `TextInput` itself — RN-web's default `font` shorthand would otherwise
keep the system sans — and a stylesheet rule kills the UA `:focus-visible`
ring so only the designed shell border shows. `BoardView` captures Wordfall
traces at the board boundary; its web-only CSS scope disables browser text
selection, touch callouts, and touch actions there, so mouse, trackpad, and
iPad-finger drags trace tiles rather than highlight their letters. Game data remains bundled
JSON; missing Supabase keys still leave every title playable. Splash uses the
black lockup in `assets/logo/`. Every screen follows the Block Blast UI kit
(`docs/DESIGN_SYSTEM.md`, D-067): `App.tsx` paints a full-bleed
`SkyBackground` (the menu sky, or the play sky behind a board and its result)
and keeps the app in a phone-width column (`COLUMN_MAX_WIDTH`, 560px) on wide
screens. Menu screens get the kit's coral `TopBar` (daily flame, block logo,
coins; or back, block logo, coins); game and result screens hide it. There is no
drawer: Home's bottom row opens Settings, Scores, Teams and Account, and the
gold Play there reopens the game with the most recent `playedAt` across the
score boards (More or Less before anything has been played). Settings is a
pop-up (`src/ui/SettingsPopup.tsx`) holding the sound / vibration switches,
Account, Scores, Teams and Send feedback. The deer mascot is no longer on
screen; `src/ui/lottie/` stays in the repo unused. The dev-only `?kit` page
(`src/ui/dev/`) renders every design-system primitive for review. The web
export fills `100dvh` so mobile URL-bar `100vh` does not clip the hub, and the
pre-JS shell paints the kit's navy (`scripts/patch-web-head.mjs`) so nothing
flashes another colour before the sky draws.

---

## Journey 5a — A finished run becomes XP, stars, coins, and a daily chest

`App.tsx` owns the end of a solo run. Before `recordScore`, it computes
`isNewBest` from the board already on the device. A tie is not a new best.
The saved row includes `boosted` when the run spent coins. `applyRun` then
grants XP, stars, and coins, and the first finished run of the local day
makes today's chest ready. `saveRewards` writes `wordkrush.rewards.v1`.
A Wordfall loss takes the same path, including the daily flame. Live races
skip rewards and never show boosts.

The result sheet shows the stars, XP, and coins from the events `applyRun`
returned. A level-up or milestone celebration opens after that sheet, not
instead of the value reveal. More or Less still counts the hidden value up
before the result. The hub chest reads locked ("Finish any run to open
today's chest"), ready ("Open — Day N/7"), or claimed ("Back tomorrow").

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
[wordfall-weekly-gauntlet](../.cursor/skills/wordfall-weekly-gauntlet/SKILL.md);
it will run as a Grok Automation once configured in the Cursor Agents Window.
It maintains the four-week queue on the standing
`content/wordfall-weekly` content branch rather than needing a Superthread card
for every Monday (D-058, D-059, D-060).

**2. Local production check, then the row ships like code.** [BUILT: web · blocked on owner: iOS]
Before GitHub, Job B runs `npm run check`, `npm run build:web`, and
`npm run serve:web` (port 8080) and playtests that export (D-038). Merge to
`master` deploys web (D-020, D-029). iOS only sees the row after a store build
that contains it is installed. That is why the weekly spec keeps a buffer of
unpublished Mondays in the same catalog. An open standing PR is extended
when the buffer falls below four; a healthy catalog creates no new PR.
Applying `automation:auto-merge` validates the named content branch and marks
an eligible draft ready. The resulting event merges only after CI succeeds for
the exact current head. This narrow content-branch exception never pushes
directly to `master` or bypasses a failed or pending check.

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

## Journey 7 — A Reddit post becomes a day of More or Less

The second surface. More or Less runs inside a Reddit post via Devvit — no
link-out, no install, no App Store. One post a day, the same questions for
everyone on it, and a board that a client cannot lie to. Decision and stated
costs: D-042. Local contract: [reddit/README.md](../reddit/README.md).

**This operating system does not operate this channel.** The `reddit/` app and
its Devvit deployment remain in the repo as product how-it-works, but no bot
posts to Reddit or publishes the Devvit app. Acquisition in this OS is organic
X only (constitutional rule #4).

```
 DEVVIT CRON            DEVVIT SERVER                 WEB VIEW (iframe)
   │                       │                              │
   │ 13:00 UTC             │                              │
   ├──────────────────────►│ seedFromDate(today)          │
   │                       │ startRun(POOL, seed)         │
   │                       │ submitCustomPost(postData:   │
   │                       │   day + round 0's two labels)│
   │                       │ pin seed → Redis             │
   │                       │                              │
   │                       │                  splash renders from postData
   │                       │                  (0 network calls, 1.5 KB)
   │                       │                              │
   │                       │◄── GET /api/init ────────────┤ tap Play
   │                       │ round: left+value, right LABEL ONLY
   │                       │                              │
   │                       │◄── POST /api/guess {choice} ─┤ tap More / Less
   │                       │ reducer judges; streak++     │
   │                       │ ──► verdict + revealed value + NEXT round
   │                       │                              │
   │                       │ run ends → zScore? → zAdd    │
   │                       │ ──► rank + spoiler-free grid │
```

**1. The engine is imported, not reimplemented.** [BUILT]
`reddit/src/shared/` imports
[engine.ts](../src/games/more-or-less/engine.ts) and
[wikipedia-popularity.json](../src/data/categories/wikipedia-popularity.json)
straight out of the Expo tree, so a fairness or difficulty change lands on both
surfaces. Three things hold that boundary: `additionalSourceRoots` in
`devvit.json` ships the parent files to app review;
`reddit/tools/tsconfig.shared.json` lists every crossing file so a new engine
import fails with TS6307 instead of dragging Clueless and Wordfall into a Reddit
bundle; and the root `vitest.config.ts` runs `reddit/src/shared/**/*.test.ts` so
`npm test` still answers for both.

**2. The server owns the run.** [BUILT]
The client never receives the seed or a hidden value and is never asked what it
scored — it posts `"more"` or `"less"` and the server judges it against state the
browser has never seen. The build is the proof: neither client bundle contains
the pool, the values, or the engine. This is the
[SEC-01](security-and-anti-cheat/THREAT-MODEL.md#sec-01--the-global-leaderboard-accepts-any-number-a-client-sends--critical)
problem, absent here — Devvit puts a server next to the game for free, which the
Expo build does not have.

**3. The round trip hides inside the reveal.** [BUILT]
`/api/guess` returns the verdict, the revealed value **and** the next question in
one response, so the next round is already in hand while the player is still
reading the number. That is why one call per tap costs nothing perceptible.

**4. Only the first run counts.** [BUILT]
Everyone on a post gets the same sequence, so a replay is the same questions with
the answers known. `recordRun` checks `zScore` before `zAdd`; the board itself is
the "have they played" flag, so there is no second piece of state to fall out of
sync. Logged-out readers can play the whole run — they simply cannot be ranked,
which is a deliberately soft failure because a login wall would cost more plays
than the board is worth.

**5. The result is spoiler-free, and the player posts it.** [BUILT]
`buildShareText` emits squares and a standing — no label, no value, no direction
— so a comment cannot poison the post for later readers. "Copy result" puts it on
the clipboard; nothing comments on a player's behalf.

**6. The weekly snapshot became a daily calendar.** [BUILT]
D-052's Monday enqueue feeds the newest published round into seven posts. Each day's seed is
`seedFromDate` (UTC), and `createDailyPost` is idempotent per calendar day, so
the cron task, the moderator menu item and the install trigger cannot split a
community's board across two posts. Everyone on a post plays that round's names;
personal round-gating stays on Expo/web.

**Not on this surface:** Supabase accounts, the global leaderboard, the
cross-game daily streak, and PostHog. Reddit identity and Devvit Redis replace
the first two; the rest have no counterpart. There is also no CI job yet — the
Reddit app is typechecked with `npm run reddit:types`, by hand.

---

## Journey 8 — A Clueless player clears a personal path

**1. The start screen restores a local path cursor before enabling Play.** [BUILT]
`src/games/clueless/path.ts` owns pure progression math and
`path-storage.ts` persists only `completedThrough` plus a local-calendar
`nextUnlockOn`. Levels 1–3 open back-to-back. Completing level 3 or a Daily
Vault schedules exactly one future level at the player’s next local midnight;
an unfinished level cannot advance the path.

**2. Level metadata owns help and content.** [BUILT]
`src/data/clueless/levels.ts` maps every solo level to a distinct bundled
puzzle, reviewed name/copy, phase, and hint policy. First Spark reveals its
hint immediately, Follow the Heat after 15 valid unique guesses, and No Map
does not reveal one. Later Vaults default to no hint, with reviewed Clue Drops
as explicit exceptions. The engine remains a pure lookup/reducer; no runtime
model or content fetch is involved.

**3. Solo and team paths cannot spoil each other.** [BUILT]
The solo catalog and `src/data/clueless/campaign.ts` reserve disjoint answer
streams. A team race therefore cannot reveal a future Daily Vault. The former
UTC `todaysPuzzleNumber` selector remains only to identify historic saves.

**4. Scores remain comparable.** [BUILT]
Finished runs retain `game_id = clueless` and derive the existing
`easy`/`standard`/`expert` context from a level’s assistance policy. Local and
global boards remain partitioned by that context; historical `clueless` rows
normalize to threshold help. No player-selected difficulty remains.

## Journey 9 — A signed-in crew races a path row

**1. A team is invite-only.** [BUILT]
`TeamsScreen` creates or joins through RPCs (`create_team`, `join_team`) in
`0006_teams_and_live_matches.sql`, and renames, leaves, or disbands through
`0007_team_crud.sql`. There is no public directory. Deep links
`wordkrush://team?code=` and `/?team=` land on the same join path. Guests still
play solo; the Race CTA asks them to sign in. The owner is the only person who
can rename or disband; a member can leave. The owner cannot leave — they
disband.

**2. The picker is Wordfall-shaped for every title.** [BUILT]
Shared unlock math in `src/games/campaign.ts` (`unlockAfterWin`, dual
`applyMatchUnlocks`). Wordfall reuses it. More or Less reads
`src/data/more-or-less/levels.ts`. Clueless team path uses its own bundled
puzzle stream, disjoint from future solo Vaults. A row above the team cursor
stays locked; a row the team has opened but the player has not is playable in
the session and marked team-ahead. On a phone the level list scrolls in the
leftover column with Host / Join as a footer; on a laptop the roster sits in a
left column and the picker on the right.

**3. A lobby is 2–10 ready players, then a server seed.** [BUILT]
Boosts stay hidden for the whole race, so a live score cannot be boosted.
`create_match` / `join_match` / `set_ready` / `start_match`. Late joins after
`started_at` are refused. The seed is assigned on start, not by the host
client. Realtime on `matches` and `match_players` plus a 1.5s poll. Teams,
lobby, and the Race CTA copy the 2–10 cap so players see it before they ready
up (D-055). `0008_live_roster_ten.sql` replaces the RPCs if 0006 already ran
at the old 2–4 cap.

**4. Rival HUD never leaks answers.** [BUILT]
`LiveRaceHud` shows a clock and each player's numeric score plus
complete/not. Clueless never sends guessed words. `post_match_score` writes
only score, complete, and done. Live results do not insert `global_scores`.

**5. Dual unlock on finish.** [BUILT]
`finish_match` ranks the roster and bumps `team_progress` if anyone completed.
The client then advances the personal AsyncStorage cursor only when that
player completed. Backend down or unconfigured: live CTAs stay disabled and
solo Play works.

---

## Journey 10 — The Grok-bot fleet runs the product

WordKrush judgment work (deciding what to build, what content to drop, when to act) is delegated to a specialist Grok-bot fleet: Cursor Cloud Agents plus `.cursor/skills/`. GitHub Actions remain the deterministic hands: CI, deploy, content merge, email send, and Wikipedia rotate.

**1. The catalog is the contract.** [BUILT]
`docs/AGENT-OS.md` names each bot, its skill path, trigger, write surface, and stop conditions. When a bot's behavior changes, that document changes in the same PR. The architecture is a constitutional operating system: bots judge within hard limits, and Actions execute.

**2. Grok judges; Actions execute.** [BUILT for the split]
Bots read the board, the repo, the logs, the metrics, and the X account. They draft content, propose experiments, review PRs, author Superthread cards, and write reports. They never become `npm run check`, never replace CI, and never push to `master`. Actions run `check` + `web` on every push, merge content PRs only after exact-head CI passes, send the Tuesday Resend Broadcast, rotate Wikipedia, and publish GitHub Release `vX.Y.Z` from the changelog.

**3. Growth is organic X.** [PLANNED: prior autonomous playbook REJECTED; replacement is ship-led skill]
Acquisition in this operating system is organic X (@WordKrushGame) only. No Reddit posts, no Devvit launch, no DMs, no paid. The x-growth bot will maintain `~/.wordkrush-social/ledger.json` and post on ship-led triggers: account is the game; originals are drops/vaults/self-played share cards; quotes are real player shares or playable More or Less hooks; replies inbound only. No NYT reply-guy. No autonomous 3×/day posting. First spend is a ship moment or a real player share, else hold. The prior autonomous reply-bot playbook was REJECTED; replacement is ship-led skill to be written, then implemented. Caps and abort conditions still bind. The `reddit/` app and `.cursor/skills/reddit-ad-posts/` remain in the repo, unscheduled. Player email stays a Tuesday retention Broadcast (D-053, D-054, D-062), not a second acquisition campaign.

**4. Owner-only work stops the bot.** [BUILT as policy]
Apple Developer, Expo login, EAS submit, Supabase migrations, [OPEN]/[DECIDE] cards, PostHog remote flags (D-024), Wikipedia PR merge, money, captchas, `.env` secrets, force-merge, and administrative CI override are human gates. A bot writes a Superthread card and stops. Remote flags stay off (D-024 constitutional rule); the experimentation bot proposes [DECIDE] cards only.

**5. Conductor does not write `src/`.** [PLANNED until the skill lands]
The wordkrush-conductor bot reads the board, CI, content buffers, X ledger, and PostHog floor metrics daily (8–12 GMT+1 window). It writes an 8–12 line report plus Superthread ops cards for anomalies (stale PR, failing CI, empty buffer). It does NOT write `src/`, does NOT dispatch content bots, does NOT push to `master`, and does NOT dispatch Reddit (Reddit posting is parked per constitutional rule #4).

**Honesty tags:**
- **[BUILT]** — AGENT-OS.md exists; clueless-daily and wordfall-weekly skills exist; merge-labeled-content.yml auto-merges after CI; split is documented; PostHog Surveys triage path exists (v0.8.21 replaced Userback).
- **[PLANNED]** — Automations are not yet configured in Cursor (owner setup required); x-growth prior autonomous playbook REJECTED by owner (replacement is ship-led skill to be written, then implemented); conductor, product-health, experimentation, feature-dev, qa-playtest, code-review, wikipedia-reviewer, posthog-surveys-triage schedule, security-watch, growth-seo, and ad-creative skills are not yet committed.

---

## Journey 8a — A More or Less player rides a label path (and I Sabi Lagos)

**1. Levels are labels.** [BUILT]
`src/data/more-or-less/labelPaths.ts` lists two paths. `world` runs Popularity, Music stars, Movies, Football stars, World cities, Food and Hit songs. `lagos` has seven stops: Ojuelegba, Yaba, Obalende, CMS, Lekki, Ikeja and Oshodi. Each level names a bundled category, a streak target and an optional difficulty band. The categories are imported once in `labelCategories.ts`. The rules live in `src/games/more-or-less/labelPath.ts`, which is pure and tested:
- A level unlocks when the one before it is cleared.
- Stars are earned at the target, at half again (`ceil(1.5t)`) and at double.
- `recordLevelRun` returns the same object when nothing changed, so a replay never writes storage.

Progress is device-local: `wordkrush.more-or-less.path.<path>.v1`, through `labelPath-storage.ts`, using the usual pure-types-plus-non-fatal-storage pattern.

**2. A level run is a More or Less run.** [BUILT]
`App.tsx` `startLevel(path, n)` opens the existing game screen with `molLevel`, the level's category and a resume slot of `level:<path>:<n>`. The game screen adds a Goal HUD panel and, depending on the path:
- `world`: a star bar with marks at the three star streaks.
- `lagos`: `RoadProgress`, a danfo driving towards the next stop's sign.

Reaching the target throws "LEVEL CLEARED!" or "YOU SABI!", and the run carries on until the first miss. On game over, `recordLevelRun` saves the best streak and the clear. The reward summary's `level.key` gives each level its own star record (`more-or-less:<path>:<n>`).

**3. Scores stay comparable without a migration.** [BUILT]
Every level run is stored and uploaded as `game_id = more-or-less`, with the category id as its score context, exactly as Popularity always was. `global_scores` still accepts only the three game ids. I Sabi Lagos therefore has no separate global board; a Lagos-only board would need a Supabase view migration.

**4. Next level by danfo.** [BUILT]
**Next level** or **Next stop** on the result, and **Oya, enter!** on the Lagos route, call `rideToLevel`. `DanfoRide` (`src/ui/lagos/DanfoRide.tsx`) covers the screen in danfo yellow (sky blue on the world path). It calls `onCovered`, which starts the level underneath. The bus then pulls in under the stop's sign, holds while the conductor calls the stop, and drives off as the cover fades.

**5. `/isabilagos` is a web path, not a router.** [BUILT]
`server/serve.mjs` already serves `index.html` for extensionless paths. `webHistory.ts` `openedAtLagosPath()` sends a visit to `/isabilagos` straight to the Lagos route and skips the welcome. While the Lagos route or a Lagos run is open, `syncLagosPath` keeps that address in the bar with `replaceState`, so it can be shared. The hub's yellow `LagosBanner` and the one-time `LagosAnnouncement` (shown only to returning players, `wordkrush.seen.isabilagos.v1`) are how players find it.

## Journey 11 — Two strangers play a 1v1

**In one line:** two players who have never met find each other on a shared Realtime channel, play the same seeded run on their own devices, and tell each other their streaks as they go. No tables, no migration, no sign-in.

**Finding someone.** Tapping the Home card opens `DuelScreen`, which runs one `DuelController` (`src/duel/controller.ts`). The controller joins the public presence channel `wk-duel-queue-v1`. Everyone looking shows up there. `partnerFor` (`src/duel/rules.ts`) pairs the longest-waiting players, so both sides reach the same answer without talking to each other, and the host is the one who joined first. The host broadcasts `pick`, the guest answers `accept`, and both leave the queue for a private room, `wk-duel-room-<code>`. A `pick` that gets lost is sent again.

**Nobody there.** After `GHOST_AFTER_MS` (10s) the search ends with a ghost (`src/duel/ghost.ts`): a seeded, simulated opponent whose streak is planned from the player's best (`ghostTarget`). The same happens at once if there is no backend at all. A ghost is always marked `ghost: true`, drawn with the ghost icon and tag, and named on the result. It is never counted as a person, and `duel_matched` reports it separately.

**Inviting a friend.** `inviteFriend` opens a room straight away and shows `https://wordkrush.com/duel/<code>`. The server's normal page fallback serves the app at that address. `App.tsx` reads the code once with `roomFromPath`, skips the welcome and clears the address bar, so a refresh does not rejoin a dead room.

**The match.** The room exchanges `ready`, then `go` with the seed and both players' names and flags. After a 3-second face-off both devices play `GameScreen` with `persist={false}` on the whole Popularity snapshot. It must be the whole snapshot: `soloPool` depends on the player's own weekly set, which would give the two sides different pairs. Each change sends `score {streak, done, atMs}`, and a heartbeat goes out every `HEARTBEAT_MS` (2.5s).

Scores and exits carry the sender's id, and the host answers only the first player in, so a link posted in a group chat cannot disturb a match. The clock is final: `report` refuses answers after `DUEL_MS`, so both sides settle on the same answers during the grace period.

**How it ends.** `settle` is the only rule. Longest streak wins, and equal streaks go to the lower `atMs`. It ends early once the player still going passes the one who missed, and otherwise at `DUEL_MS` (60s). If the opponent says `bye` or goes quiet for `SILENCE_FORFEIT_MS` (9s), the player still there wins. `DuelScreen` then calls `finishRun`, so a match pays like any run and goes on the player's own board with their own streak.

**Where the flag comes from.** `loadIdentity` (`src/duel/identity-storage.ts`) keeps a random id, a guest name and a country in AsyncStorage. The country comes from `/country` in `server/serve.mjs`, which reads Cloudflare's `cf-ipcountry` header, and falls back to the device locale. A player's own pick is never overwritten. The flag is sent only to the current opponent.

**Failure modes.** No connection: a ghost. Search failing part-way: handshake timeouts return to searching or show a retry. A dead invite: "That invite does not work" with a button to find an opponent. Windows shows country letters instead of flag pictures, because it has no flag emoji.

## System reference

Quick map of where each journey step lives:

| Piece | Where | Status |
|---|---|---|
| App shell (iOS + web) | `App.tsx`, `index.ts`, `app.json` | [BUILT] — WordKrush hub, lockup splash `#0A0817`, `expo-font`; web at wordKrush.com uses `100dvh`; phone is full-bleed, laptop is a 1080px column (D-051) |
| Brand kit | `assets/logo/`, `docs/branding/`, `BrandArtwork`, `BlockLogo` | [BUILT] — black lockup on splash, favicons and share cards; in the app the WORD-KRUSH! block logo (kit style) on the top bar and the first visit |
| Mascot (deer) | `src/ui/lottie/`, `LOTTIE_CLIPS`, `assets/lottie/deer.lottie` | [PARKED] — off screen since 0.10.0: the Block Blast kit has no mascot. Code and asset kept (D-032, D-050) |
| Display type | `@expo-google-fonts/exo-2`, `src/ui/fonts.ts`, `src/ui/theme.ts` | [BUILT] — Exo 2 on every app text tier (stand-in for the kit's Neuron, D-067); Fredoka stays for the server's share cards |
| Fairness guard + difficulty bands | `src/games/more-or-less/pairing.ts` (+ 9 tests) | [BUILT] |
| Daily 10 | `src/games/more-or-less/daily.ts` (+ `daily-storage.ts`), `buildDailyShareText`, `src/ui/DailyCard.tsx` | [BUILT] — `dailySeed(dayKey)` (FNV-1a over the local day) on the whole Popularity snapshot. Ten pairs (`targetStreak` 10), no `onSpend` so no boosts or second chance, a `daily:<day>` resume slot. One result per day in `wordkrush.more-or-less.daily.v1`; numbered from 2026-10-25 |
| 1v1, ghosts and flags | `src/duel/` (rules, ghost, controller, transport, identity, country), `src/ui/screens/DuelScreen.tsx`, `src/ui/duel/DuelHud.tsx`, `src/ui/DuelCard.tsx`, `src/ui/FlagPicker.tsx`, `/country` in `server/serve.mjs` | [BUILT] — Realtime presence and broadcast on public channels (D-072), no tables. Pure rules and a controller tested with a fake network; see Journey 11 |
| Challenge a friend | `src/games/more-or-less/challenge.ts`, `MoreOrLessShareData.challenge` in `src/games/share-data.ts`, `src/ui/ChallengePopup.tsx` | [BUILT] — a level result's share link carries `{seed, path, level}`. Opening `/share/<token>` offers the run: the same seed, no unseen-first steering, a `challenge:<seed>` resume slot, and a Rival HUD. The result gives the verdict, and Play again is a rematch. The server's card check ignores the extra field |
| More or Less level paths + I Sabi Lagos | `src/games/more-or-less/{labelPath,labelPath-storage}.ts`, `src/data/more-or-less/{labelPaths,labelCategories}.ts`, `src/ui/lagos/`, `src/ui/screens/LagosScreen.tsx`, `src/ui/{LabelLevelCard,LabelLevelsPopup}.tsx` | [BUILT] — device-local unlocks and stars; `/isabilagos`; danfo ride between levels; scores stay under `more-or-less` with the category as context (Journey 8a, D-068) |
| Engine reducer, pair selector, scoring | `src/games/more-or-less/engine.ts` | [BUILT] |
| Bundled game data | `src/data/categories/*.json` | [BUILT: dir, populated on first export] |
| Reddit app (Devvit) | `reddit/` — `devvit.json`, `src/{shared,server,client}` | [BUILT: builds + typechecks] — blocked on owner: `devvit login`, a launch subreddit, and app review (D-042) |
| Reddit shared boundary | `reddit/src/shared/`, `reddit/tools/tsconfig.shared.json` | [BUILT] — imports the Expo engine + snapshot; crossing files listed explicitly |
| Reddit run + board | `reddit/src/server/core/{run,board,post}.ts` (Devvit Redis) | [BUILT] — server judges every guess; first completed run only |
| Keyword lists | `pipeline/keywords/` | [BUILT] |
| Ingest + validation | `pipeline/ingest.ts` | [BUILT] |
| Local AI test player | `pipeline/ensure-test-player.ts` | [BUILT] — `TEST_PLAYER_*` in `.env` only; `npm run auth:ensure-test-player` (D-035) |
| Source adapters | `pipeline/sources/` (Wikipedia active; mock available for deterministic checks) | [BUILT] |
| Export | `pipeline/export-snapshot.ts` | [BUILT] |
| LLM validator (schema/API/CLI) | `validator/` (+ 18 tests) | [BUILT] |
| Content DB schema | `supabase/migrations/0001_init.sql` | [BUILT: apply on the owner project] |
| Accounts + first leaderboard tables | `supabase/migrations/0002_leaderboard.sql` | [BUILT: apply on the owner project] |
| Optional auth (email magic link) | `src/auth/` (`redirect-url.ts` `webAuthRedirectUrl`), `src/ui/screens/AuthScreen.tsx`, `supabase/templates/magic-link.html` | [BUILT] — email-only magic link; unique username; web origin (scheme required) / native deep-link restore. Template keeps `{{ .ConfirmationURL }}` + `{{ .Token }}`. Custom SMTP required to save it on this free project (D-033, D-037) |
| Player weekly email | `pipeline/player-email.ts`, `pipeline/player-email-news.ts`, `pipeline/player-email-draft.ts`, `assets/email/`, `.github/workflows/player-email-weekly.yml` | [BUILT] — Tuesday 09:00 UTC Resend Broadcast from this week’s changelog + Wordfall; OpenRouter drafts player copy once; hero is in-game art/hub screenshot at `/email/`; quiet weeks skip; `{{{contact.first_name|there}}}` / `{{{game|the games}}}`; job uses GitHub Environment `best-games`. Never on Railway (D-054, D-062) |
| Unique leaderboard username | `supabase/migrations/0004_unique_username.sql`, `src/auth/validation.ts` `usernameKey` | [BUILT: apply on the owner project] — unique index on `username_key(display_name)`; duplicate maps to "That username is taken." |
| Cross-game global board | `supabase/migrations/0003_global_scores.sql`, `src/scores/global.ts` | [BUILT] |
| Clueless local path + assistance boards | `src/games/clueless/{path,path-storage}.ts`, `src/data/clueless/levels.ts`, `src/games/clueless/scoring.ts` | [BUILT] — local-midnight Daily Vault gate, level-owned assistance, and stable score partitions under `clueless` id |
| Teams + live races | `supabase/migrations/0006_teams_and_live_matches.sql`, `0007_team_crud.sql`, `0008_live_roster_ten.sql`, `src/teams/`, `src/live/`, `src/games/campaign.ts` | [BUILT: apply migrations] — private teams with rename/leave/disband, 2–10 player races, dual unlock; live scores stay off `global_leaderboard` |
| Local scores | `src/scores/storage.ts`, `src/scores/types.ts` | [BUILT] |
| Scores UI (global + local tabs) | `src/ui/screens/ScoresScreen.tsx` | [BUILT] |
| CI | `.github/workflows/ci.yml` | [BUILT] — `check` (docs + typecheck + tests) and `web` (`build:web`) in parallel; deploy waits for both |
| Content PR merge gate | `.github/workflows/merge-labeled-content.yml` | [BUILT] — the configured `CONTENT_AUTOMERGE_TOKEN` marks labelled drafts from `content/clueless-daily` and `content/wordfall-weekly` ready, then merges only after their exact head passes CI while preserving the normal master release path (D-059, D-060) |
| Wikipedia popularity weekly | `.github/workflows/wikipedia-popularity-weekly.yml`, `pipeline/rotate-wikipedia-popularity.ts`, `pipeline/keywords/wikipedia-popularity-reservoir.json` | [BUILT] — Monday 09:00 UTC + `workflow_dispatch`; re-measures shipped items and enqueues a new label round; PR on `content/wikipedia-popularity-weekly`, never `master` (D-036, D-052) |
| CI | `.github/workflows/ci.yml` | [BUILT] — `check` (docs + typecheck + tests) and `web` (`build:web`) in parallel; deploy waits for both, then `railway up --service wordcrush` |
| GitHub Release | `.github/workflows/release.yml`, `scripts/changelog-notes.mjs` | [BUILT] — every PR is a version; publish `vX.Y.Z` from that changelog section on master merge or tag (D-039, D-041) |
| Edge | Cloudflare (DNS + proxy for `wordkrush.com`) | [BUILT] — nameservers moved from Namecheap on 2026-10-25. The apex and `www` are proxied with SSL mode Full. HTML is not cached (`no-cache`), so a deploy shows at once; `/_expo/` bundles, hashed `/assets/` (including the `.mp4` music) and share-card PNGs are cached at the edge. The Resend records (`resend._domainkey`, the `send` CNAME) and `_dmarc` are DNS-only. The `www` → apex redirect rule is set up in the dashboard (D-070) |
| Uptime | `.github/workflows/uptime.yml`, `scripts/synthetic-check.mjs`, `/healthz` in `server/serve.mjs` | [BUILT] — every 10 minutes: the shell (200 HTML with the app root), the main bundle (JavaScript, immutable), `/healthz` (`ok` plus the live version) and `/isabilagos`. `www` not redirecting is a warning. A failure fails the run, and GitHub emails the owner |
| Crash and vitals counters | `src/ui/ErrorBoundary.tsx`, `src/analytics/observe.ts`, `src/analytics/vitals.ts`, wired in `index.ts` | [BUILT] — a render error shows a Reload screen. `app_error` counts render, uncaught and unhandled-rejection errors (our origin only on web, at most 10 per page view). `web_vitals` sends LCP, worst interaction, CLS and TTFB once per page view, when the tab hides. Both are consent-gated and carry no messages, stacks or URLs |
| Web host | `railway.json`, `server/serve.mjs` | [BUILT] — Nixpacks runs `CI=true npm run build:web` on service `wordcrush`; `serve.mjs` listens on `$PORT`; Railway's health check is `/healthz`; extensionless paths such as `/isabilagos` get the app; audio is typed (`audio/mpeg`, `audio/mp4`) and answers single byte ranges with 206, which Safari needs for media (`parseByteRange`) |
| Short-screen layout | `src/ui/layout.ts` `heightClass`, `src/ui/useHeightClass.ts` | [BUILT] — `regular` / `compact` (≤759 px tall) / `tight` (≤619). `HudPanel`, `BoosterDock` and `BoostBar` shrink on their own; Higher or Lower puts its cards side by side and compacts the question and credits |
| First visit | `src/ui/screens/OnboardingScreen.tsx` | [BUILT] — a game picker shown once before any score: a tile opens that game's start pop-up (or the Lagos route); "Look around first" goes to Home |
| Web viewport CSS | `src/ui/webViewport.ts` `WEB_VIEWPORT_CSS`, mirrored in `scripts/patch-web-head.mjs` | [BUILT] — `100dvh` page, navy fill, board-only selection/touch suppression. Only `#root` is full height: React Native Web's empty modal hosts are `body > div` too, and at full height they gave the hidden page scroll room that focus could jump into |
| Web favicon + share preview | `assets/favicon.png`, `assets/apple-touch-icon.png`, `assets/logo/wordkrush-lockup.png`, `scripts/patch-web-head.mjs` | [BUILT] — cache-busted tab icons in `dist/`; Open Graph / Twitter tags with the lockup at `/og-image.png`; Tuesday mail heroes at `/email/` from `assets/games/` + `assets/email/hub.png` |
| Web search surface | `scripts/patch-web-head.mjs`, `server/serve.mjs`, `assets/googled8072618779c67b2.html`, `dist/robots.txt`, `dist/sitemap.xml` | [BUILT] — homepage title, canonical, JSON-LD, and hub copy in `#root` / `<noscript>`; sitemap lists `https://wordkrush.com/` only; `.xml` is `application/xml`. Search Console HTML verification is copied to `/googled8072618779c67b2.html` (not in the sitemap). After Railway deploy: confirm that URL in [Search Console](https://search.google.com/search-console), submit `/sitemap.xml`, then URL Inspection → Request indexing (D-061) |
| Documentation drift guard | `scripts/check-docs.mjs`, `.cursor/hooks/check-docs-on-stop.mjs` | [BUILT] — audits git-visible changes; version-only `package.json` / `app.json` bumps are changelog (D-049); Finder `* 2.*` copies and `supabase/.temp/` are gitignored so they do not count as source |
| Agent operating system | `docs/AGENT-OS.md` | [BUILT] catalog + merge gate; [PLANNED] Automations not configured — clueless-daily skill, wordfall-weekly skill, wordkrush-conductor, x-growth (prior autonomous playbook REJECTED; ship-led replacement to be written), player-email, product-health, experimentation, feature-dev, qa-playtest, code-review, wikipedia-reviewer, posthog-surveys-triage schedule, security-watch, growth-seo, ad-creative |
| Consent and product analytics | `src/analytics/` | [BUILT] |
| Player feedback (bugs + suggestions) | `src/feedback/`, `src/ui/FeedbackPrompt.tsx`, drawer "Send feedback" | [BUILT] — PostHog Surveys API prompt on web and native; signed-in players attach id/username/email on the event, guests stay anonymous. Independent of analytics consent. |
| EAS build/submit profiles | `eas.json` | [BUILT: needs Expo login + Apple Developer] |
| Chime | `scripts/synth-chimes.mjs`, `assets/sounds/chime/`, `chime()` in `src/native/feedback.ts` | [BUILT] — eight synthesized pentatonic notes: Wordfall plays one per traced letter, Higher or Lower climbs with the streak; gated by Sound |
| Music | `src/native/music.ts`, `assets/music/` | [BUILT] — two looping Afrobeats instrumentals: `menu` everywhere except a game, `play` in one, chosen by `App.tsx` from `screen.name`. Its own Settings switch (`FeedbackSettings.music`; a save from before 0.12.0 upgrades with music on). Pauses on `AppState` background, which on web is tab visibility. Web unlocks on the first pointer or key press, inside the gesture. Shares the mixing audio mode with `sound.ts` (D-069) |
| Sound + haptics | `src/native/feedback.ts`, `src/native/sound.ts`, `src/native/haptics.ts`, `assets/sounds/`, `src/settings/` | [BUILT] — one `feedback(event)` table maps five game moments to a clip + haptic; sound, music and vibration each switch separately in Settings. Native mixes with other audio (`mixWithOthers`); web sets Safari's `navigator.audioSession.type = 'ambient'` where it exists, so a player's own music keeps playing. See D-043 |
| Result share | `src/games/share.ts`, `src/games/share-data.ts`, `src/games/<id>/share.ts`, `src/games/more-or-less/card-photos.ts`, `src/native/share.ts`, `src/native/share.native.ts`, `server/serve.mjs` `/share/:id` + `/og/share/:card.png`, `server/share-document.mjs`, `server/og-card.mjs`, `server/og-image.mjs`, `server/og-photos.mjs` | [BUILT] — spoiler-free emoji grid per game; RN `Share` on native, `navigator.share` then clipboard on web; dynamic share URLs (`/share/:id`) carry encoded result data and serve 1200×630 PNG OG images via sharp. **More or Less draws the board**: two stacked, full-bleed photo cards above MORE / LESS, tracing the signed crop, on the game's own theme tokens, with no title, grid, streak, best, seen, item name, value or `? ? ?` — the only words on the card are `More` and `Less`, and the standing reads in the paste line above the link instead. A `theme.bgElevated` bottom band (`MORE_OR_LESS_BOTTOM_SAFE_PAD`, 110px — the signed bar) sits under the button row so X's green `WordKrush · More or Less` title strip on `summary_large_image` lands on ink, not on MORE or LESS. Clueless (heat spread + guess count) and Wordfall (length-coded grid + score) still draw their result grid. Never answers, guessed words, or item labels. **`/share/:id` HTML is a dedicated OG document**: `scripts/patch-web-head.mjs` delimits every part of the built shell that describes the hub (`HEAD_MARKERS`, `COPY_MARKERS`) and `share-document.mjs` replaces those blocks whole, so the hub's `description`, JSON-LD and "Choose your game" copy cannot survive onto a share page — pattern-matching the `og:*` tags out used to leave all three behind. The result's head carries `description`, self `canonical`, `og:image:type`, `og:image:alt` / `twitter:image:alt`, `twitter:site`; the crawler copy in `#root` **and** `<noscript>` describes the result; the bundle and layout CSS are untouched, so a player who clicks still lands in the game. `warm()` throws if the shell is unmarked. **Share tokens are unpadded base64url** (`-` / `_`, no padding). They used to write base64's `=` padding as `~`, and `twitter-text` — the library X's composer uses to find links in a draft — allows `~` inside a URL but not at the end of one, so ~half of all payloads reached the composer truncated at the padding, query string and all, and unfurled nothing. The decoder still accepts the `~`-padded tokens shared before 0.8.35 and either spelling with `=`, and ids are percent-decoded to one canonical form first (`%7E` used to 404, because `url.pathname` keeps escapes). A payload is decoded once and validated once (`isDrawableShare` in `og-card.mjs`): the renderers read counts straight out of it (`Array(data.heatBuckets.cold)` is a square per guess), so every route that can reach one answers HTTP 404 — not the SPA homepage, and not a stack trace or a nine-figure allocation — to anything that is not a result. `og-image.mjs` installs Fredoka SemiBold TTF via fontconfig at startup (`$TMPDIR/wordkrush-fonts/`) so librsvg/pango renders "Fredoka SemiBold" in SVG text elements; button arrows are polygons, not U+2191/U+2193, which Fredoka does not contain. The grid emoji have no covering face and still render as `.notdef` boxes on Clueless and Wordfall (open, needs an owner call — see the note under this table). **The card is served from a short static path, `/og/share/{card}.png`** — `og-card.mjs` owns that id and the route. A card id names only what the card draws, so a More or Less board is `m_michael-jackson_albert-einstein` (≤47 characters of path), and Clueless / Wordfall, which draw their own numbers, carry the result. `og:image` used to point at `/share/{token}/og.png`, the whole payload nested under a second dynamic route, while the homepage lockup X does unfurl is a flat `/og-image.png?v=…`. The nested path still serves the identical bytes for anything that cached it: its token resolves to the same card id. **Which two photos a More or Less card draws is named by the share**, in the token's `photos` field (`src/games/more-or-less/card-photos.ts` picks them, seeded by the standing; `card-photos.test.ts` fails if the client and server id lists disagree). It used to be a hash of the encoded token, so the padded link a player copied and the unpadded one a composer kept drew different boards; a pre-0.8.35 share has no ids and its pair is derived from the decoded payload instead, which every spelling of that link shares. An id the pool never loaded falls back to a seeded stand-in rather than an empty slot. `og:image`/`twitter:image` carry `?v=<package version>` and the PNG is served `public, max-age=300`, so a render fix reaches scrapers that already unfurled a link; the image routes match on path alone, so any stamp resolves to the current render. `og:url` stays unstamped. Photo slots are ~5.9:1 (two stacked rows plus the 110px bottom safe pad), so `og-photos.mjs` crops with `sharp.strategy.attention` (a fixed band leaves hair and background, and collapses the entropy separation the licence filter needs). Rendered cards are cached in memory per **card** id (bounded, 256) and served without a `Vary` header — keying on the card rather than the share id is what makes every spelling of one link read one entry instead of rendering three boards. **The PNG is truecolour** — IHDR colour type 2, 8-bit RGB: the indexed encode the card shipped in 0.8.33 answered every scraper correctly and still could not be built into a card by X's composer (~42 s spinner, nothing), and it was the one property separating that card from the homepage lockup X does unfurl. `palette: false` is explicit because sharp re-enables the quantiser for anyone who adds `quality`, `effort`, `colours` or `dither`, and `flatten` onto `theme.bg` makes the rasteriser's RGBA into RGB rather than colour type 6. `adaptiveFiltering` carries the weight the quantiser used to (~910 KB → ~400–770 KB per card); `compressionLevel` stays at 6 because 9 buys under 5% for three times the CPU. Colour type is asserted on the encoded bytes in both server suites — `sharp().metadata()` reports three channels for an indexed card as readily as a truecolour one, so it cannot be asked through a decoder. `server/serve.test.mjs` warms the real server over loopback and holds the response contract; `server/share-document.test.mjs` and `server/og-image.test.mjs` cover the rewrite, the boot guard and what the card actually draws. |
| Wordfall match juice | `src/ui/wordfall/clearJuice.ts`, `src/ui/wordfall/BoardView.tsx` | [BUILT] — puff then fall on `lastPlay.cleared`; special-birth pop by tile id; Crush/Nova stamp on chain ≥ 2. RN `Animated`, not Lottie (ST-80, D-032) |
| Wordfall weekly drops | `src/games/wordfall/schedule.ts` (`taskFingerprint`), `src/data/wordfall/levels.ts`, [WORDFALL-WEEKLY.md](WORDFALL-WEEKLY.md), `.cursor/skills/wordfall-weekly-gauntlet/` | [BUILT] gate + unique-task + local `serve:web` before GitHub (D-038); standing `content/wordfall-weekly` PR maintains four future Mondays without a card per drop and merges through the content PR gate (D-058, D-059) |
| Game Center | `src/native/` | [PLANNED] |

## Security model

- `.env` gitignored + untracked; shape in `.env.example` (names only). History clean — the one committed `.env` was empty.
- Finder duplicate names (`* 2.ts`, `* 2.png`, …) and `supabase/.temp/` are gitignored. They are local copies, not app source.
- `SUPABASE_SECRET_KEY`: pipeline-only, loaded via `tsx --env-file=.env`. Never `EXPO_PUBLIC_`-prefixed — Expo embeds those in the shipped bundle.
- `RESEND_API_KEY`: pipeline and GitHub Environment `best-games` only (Tuesday player Broadcast). Never `EXPO_PUBLIC_*`, never Railway.
- Client bundles contain only publishable Supabase and PostHog project
  configuration under `EXPO_PUBLIC_*`; none grants privileged server access.
- Supabase access is constrained by Row Level Security (`players`,
  `leaderboard_entries`, `global_scores`, `teams`, `matches`, `match_players`).
  Clients insert only their own scores and cannot update or delete a submitted
  one. Team and match writes go through `SECURITY DEFINER` RPCs. PostHog
  remains opted out until explicit consent and never receives guessed content
  or account identity until identify.

## Risk register (live)

| Risk | Severity | Mitigation | Status |
|---|---|---|---|
| Metric source confusion | Low | Wikimedia pageviews is v1; future keyword APIs remain optional later upgrades | Closed |
| Guideline 4.2 rejection (app too thin) | Medium | Offline play and haptics ship; Game Center still planned. Supabase global ranks are web+iOS, not a native Game Center substitute | Open |
| Difficulty bands feel wrong | Medium | Constants isolated in `pairing.ts`; tune via playtest | Open |
| Stale bundled data | Medium | Per-item `updatedAt`; weekly rotate PR; swing check on refresh; revisit D-004 if painful | Accepted |
| Core mechanic unverified vs reference game | Medium | BRAINSTORM [OPEN] items; engine takes them as config | Open |
| Secret leakage | High | Security model above; rotate keys if in doubt | Mitigated |
| Share-card grid emoji render as `.notdef` boxes | Medium | Only Fredoka is installed for librsvg, and it is a Latin display face with no emoji coverage, so Clueless's heat grid, Wordfall's length grid, and its `✓` verdict are boxes on the OG image while every Fredoka text tier renders correctly. Predates the cache work and is unchanged by it or by 0.8.33, which rebuilt the More or Less card only. Two dependency-free-ish fixes, both owner calls: bundle an emoji face for fontconfig (a new dependency, and colour emoji through librsvg is unreliable), or draw those grids as shapes rather than glyphs — 0.8.33 did exactly that for the More or Less button arrows, which Fredoka also lacks, so the pattern is in the file (a card-art change, so `docs/branding/`). The in-app and pasted emoji grids are unaffected — this is the server render only | Open |

## Updating this doc

- New system/workflow → extend the journey it belongs to (or add a journey), in the same PR that builds it.
- A [PLANNED] step lands → flip its tag to [BUILT] and correct the description to match reality.
- Behavior changes → update the step; if the *decision* changed, log it in STACK first and reference the D-id.
- Retired pieces get struck through with a pointer to the replacement — never silently deleted.
