# Changelog

All notable changes to WordKrush. Format follows [Keep a Changelog](https://keepachangelog.com); versions follow semver and match `version` in `package.json` / `app.json`.

Rules:
- Every PR that changes behavior adds a line under **[Unreleased]** in the same PR.
- On release: rename [Unreleased] to the version + date, create a fresh empty [Unreleased], bump `package.json` + `app.json` when the number changes. Merging that to `master` (or pushing tag `v<version>`) publishes the GitHub Release. Then `eas build --platform ios` → TestFlight when native is in play.

## [Unreleased]

### Fixed
- **Game start screens read as one card instead of two.** The `detail` block (today’s category / puzzle / week) and the player’s stats now share a single status card, and the stats stay hidden until a run has actually been finished — a first-time player was shown a full-width accent card whose whole content was “—” and “0”. Two layout bugs went with it: `hero` added its own horizontal inset on top of the root gutter, so the detail card and the stats card sat at different widths, and the fixed column let the bottom block ride up over the detail card whenever the blurb wrapped to three lines (Clueless, and every game on a short phone). The screen is now a ScrollView with `flexGrow: 1`.

## [0.1.0] - 2026-08-22

### Fixed
- **Shared links preview the WordKrush lockup, not a generic globe.** Expo’s web export still emits no Open Graph tags. `scripts/patch-web-head.mjs` copies `assets/logo/wordkrush-lockup.png` to `dist/og-image.png` and injects `og:*` / Twitter card meta after `<title>` (absolute `https://wordkrush.com/og-image.png`). The tab favicon stays the tight W crop; that crop is too small for a large preview, so `og:image` is the full lockup.
- **The browser tab icon is the WordKrush W, not a leftover generic mark.** `assets/favicon.png` is a tight crop of the purple W tile (the 1024 master’s padding collapsed to a dark blob at 16px). `expo export` only linked `/favicon.ico`, which browsers cache for months; `scripts/patch-web-head.mjs` copies the PNG and apple-touch icon into `dist/` and cache-busts the `<link rel="icon">` href.
- **Magic-link click no longer targets a path on the Supabase API host.** `webAuthRedirectUrl` (`src/auth/redirect-url.ts`) sends web `emailRedirectTo` as the page origin with a scheme (`https://wordkrush.com`), not `/auth/callback` and not a bare host. GoTrue treats `wordkrush.com` as the path `/wordkrush.com` on `https://<project>.supabase.co` and returns `requested path is invalid`. Dashboard Site URL must be `https://wordkrush.com`.

### Added
- **GitHub Releases** — rolling CHANGELOG `[Unreleased]` to `[x.y.z]` and merging to `master` publishes `vX.Y.Z` (notes from that section). Tag `vX.Y.Z` does the same. Native EAS/TestFlight stays a human step (D-039).
- **Wordfall weekly Gauntlet agent loop** — Cursor skill plus `taskFingerprint` so each Monday drop is a unique hard task (puzzle vs race + objective kinds), featured for seven days, and never a copy of last week. Job B must run `check`, `build:web`, local `serve:web` (port 8080), and a picker playtest before GitHub (D-038). Catalog remains bundled (D-027).
- **WordKrush magic-link email** at `supabase/templates/magic-link.html`. The button is `{{ .ConfirmationURL }}` (the one-time link); the 6-digit `{{ .Token }}` stays as the in-app fallback. `{{ .SiteURL }}` is the dashboard Site URL, not the sign-in link, and must not be the button href. Free-tier Auth cannot save custom templates until custom SMTP is configured in the dashboard (typically Resend: `smtp.resend.com`, port 465). Paste the HTML after SMTP is live. SMTP secrets stay out of the app.
- **Weekly Wikipedia popularity cron** — Monday 09:00 UTC (and `workflow_dispatch`) re-measures the curated Popularity keyword list via `npm run pipeline:rotate` and opens a review PR when values, images, or the pageview window changed. No play-time fetch (D-004, D-036).
- **Deer mascot** — hub hero plus outcome screens (More or Less game over, Wordfall level complete/fail, Clueless solved) play the little deer via Lottie. Clip CDN URLs live in `LOTTIE_CLIPS` (`src/ui/lottie/sources.ts`); deer poses share the hosted file until distinct poses are pasted. Flame and burst slots stay empty. Bundled `assets/lottie/deer.lottie` is the offline fallback. Reduce-motion holds the first frame. Play and game data stay offline (D-004).
- Documentation drift guard: one changed-file audit shared by local checks, CI, and a Cursor completion hook, with explicit document-impact guidance
- Expo SDK 57 + TypeScript scaffold (iOS + web from one codebase)
- Pure More-or-Less logic in `src/games/more-or-less/` with ratio-based pairing fairness guard and streak difficulty bands, unit-tested (Vitest, 9 tests)
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
- **Completion time is recorded and shown** — `ScoreEntry.durationMs` (optional; WordKrush comparison has nothing meaningful to report), rendered on the level-complete card and in the scores list
  - Scores rows now label the unit from the registry instead of hardcoding "rounds", which read as "8,436 rounds" for Wordfall and "5 rounds" for Clueless
- **Wordfall dictionary** (`npm run pipeline:wordfall` → `src/data/wordfall/dictionary.json`, 550 KB) — Webster's 1913 (public domain) plus a curated core-English and modern-word supplement, intersected with the existing Clueless frequency vocab to produce a rarity ranking and measured per-letter spawn weights
  - Inflections are derived at lookup by suffix-stripping rather than stored: 40% smaller than generating them (995 KB → 550 KB) and better recall, since it covers words the generator never would
  - Lookup binary-searches packed fixed-width strings, so there is no Set to hydrate and no startup cost

- **Web hosting on Railway** (`railway.json`, `server/serve.mjs`) — resolves STACK O-6. Live at https://web-production-548e8.up.railway.app
  - Railway builds from source (`npm run build:web`) and serves `dist/` with a zero-dependency Node static server: brotli pre-compressed at boot (2.89 MB → 0.77 MB over the wire), ETag/304 revalidation, `immutable` caching for Expo's hashed bundle and `no-cache` for the `index.html` that points at it, and SPA fallback for extensionless routes only
  - `npm run serve:web` runs the same server locally, so a production build can be checked before it ships
  - CI deploys on green `master` only (`.github/workflows/ci.yml`); the job skips with a warning when `RAILWAY_TOKEN` is absent rather than failing the build
- **Consent-gated PostHog analytics** — typed product, game-balance, auth-status, persistence, and reliability events; anonymous opt-in prompt plus a persistent drawer control; no PII, account identification, autocapture, person profiles, exception capture, feature flags, or session replay
- **Local scores plus a global leaderboard** — Scores has Global and On this device tabs. Finished runs still write to AsyncStorage first; signed-in players upsert pending rows to `global_scores`, and `global_leaderboard` shows each player's best per game (Clueless ranks lower-is-better). A missing or failed backend leaves the device board unchanged.
- Bundled **Fredoka** display faces (`expo-font`, `@expo-google-fonts/fredoka`) and WordKrush splash/icon chrome (`#0A0817`)
- **WordKrush brand kit** — lockup (black + clear + SVG) and W mark in `assets/logo/`, identity/usage/colour in `docs/branding/`. Splash uses the black lockup; auth and Android foreground use the clear lockup; app icon stays the W. Umbrella accent is lockup gold (`brand.krush`).
- Wordfall level cards now carry a short player-facing `description` so the picker states the objective before play
- **Wordfall weekly drops** — new levels ship in the bundle with a Monday `availableFrom`; the picker shows “this week” / “drops …” and still requires beating the previous level. The launch set (1–11) stays available on day one
- **Local AI test player** — `npm run auth:ensure-test-player` creates a confirmed Auth user and writes `TEST_PLAYER_EMAIL` / `TEST_PLAYER_PASSWORD` / `TEST_PLAYER_USERNAME` to `.env`. Not a service-role account; never `EXPO_PUBLIC_*` (D-035).

### Changed
- **Optional accounts are one unique username plus email magic link.** Phone/SMS is no longer a second identity, so the same person cannot fork into two leaderboard rows. Create account is username + email; sign-in is email only. `players.display_name` is unique on `username_key()` (trim, collapse spaces, lower-case). A duplicate surfaces as "That username is taken. Try another." Guest skip and offline play are unchanged (D-037).
- **Optional accounts now sign in with a Supabase magic link or SMS code**, not a password. Email sends a link (and accepts the 6-digit code from that message). Phone sends an SMS code to an E.164 number. Sessions restore from the web redirect or the native `wordkrush://` / Expo Go deep link. Guest skip and offline play are unchanged (D-033, D-034).
- **Every game now starts the same way.** Clueless and Wordfall dropped the player straight into a live board while More or Less had a start screen first; all three now open the shared `GameStartScreen` — key art, badge, name, blurb, the player's own numbers, then Play. Game-specific content arrives through a `detail` slot rather than by forking the layout — and that slot sits directly under the blurb on every game, since what is on today or this week is the reason to tap Play, not a footnote under it — and the badge/blurb live in `src/games/registry.ts`, so a new game inherits the screen. Routing follows: `home` is the start screen for every game and `game` is the live board, so leaving a run returns to that game's start screen instead of jumping to the hub. `HomeScreen.tsx` was More-or-Less-only and is superseded.
- Added `wordkrush-lockup-tight.png` — the lockup cropped to its content box — because the square masters carry ~35% transparent padding, which collapsed the logo in any header-height slot. `BrandArtwork` no longer forces the lockup into a square: `size` is its height and the width follows the artwork, so the auth hero renders it at its true proportions. App chrome (hub header, top bar) keeps the mark plus a text wordmark: the ornate lockup does not hold up at header scale.
- **Fredoka now sets every text tier**, so all three games read as one typeface instead of Fredoka headings over system-face body copy. `type.body`, `type.bodyStrong`, and `type.caption` name a Fredoka face, and the ad-hoc styles that set `fontSize`/`fontWeight` without a `fontFamily` were given the matching face. Symbol glyphs (✓ ✎ ◎ ⟷ ▤ ★ ≡) deliberately keep the system face — Fredoka does not contain them. Supersedes D-026 with D-030.
- CI requires a successful Expo web export (`npm run build:web`) in parallel with `check`; Railway deploy waits for both jobs
- In-play chrome now uses the design-system primitives: More or Less cards and the VS badge are `Surface`s, Clueless shares `GameHeader`/`ProgressPill`, Wordfall HUD/picker/outcome pull accent from the registry, and shared tints go through `gameAccentTokens` rather than per-screen alphas. Wordfall board gestures and tile animation are unchanged.
- Refined the shared UI controls and WordKrush artwork: buttons now support compact, ghost, leading-content, and accessibility-hint variants; headers support eyebrow labels; stats expose accessible value labels and custom icons; and app, splash, and game artwork use the new branded assets.
- Renamed the product to **WordKrush** (wordKrush.com). App display name, Expo slug, npm package, iOS/Android identifiers, analytics consent key, and Wikimedia User-Agent now use wordkrush. Game ids and local score keys are unchanged.
- Consolidated game-specific logic under `src/games/<game-id>/`; More or Less
  now lives beside Clueless and Wordfall, with shared RNG utilities directly
  under `src/games/`.
- Renamed the product to **WordCrush** and aligned the app, game registry, and current documentation around the promise: "Guess correctly, keep the streak alive, and beat your best score." The broader goal is engaging repeated play that strengthens cognitive skills and pattern recognition.

### Fixed
- **Railway web deploys no longer die on Expo's `CI` boolean parse.** Nixpacks leaves `CI` empty; `expo export` then throws `GetEnv.NoBoolean`. `railway.json` now runs `CI=true npm run build:web`. The Railway service is `wordcrush`, not `web`.
- **The mascot was standing in the logo's place, and rendering on a white plate.** The hub header now carries `BrandArtwork` again; the deer moved to a decorative slot above the scores button. The animation's `Shape Layer 1` — a 1700×1288 pure-white rect covering the whole 1600×1200 canvas — was stripped from `deer.lottie`, so the deer now sits on the dark chrome instead of a white box. `Mascot` prefers the bundled file over the lottie.host copy, which still serves the white layer.
- **The app mark is no longer the old pink W.** `wordkrush-mark.png` still held the pre-rebrand icon, so the top bar, drawer, app icon, and favicon shipped the retired `#FF5D8F` palette next to the new gold/purple lockup. The mark is now the lockup's purple W tile, masked to its own silhouette and composed on `brand.ink`; `icon.png` and `favicon.png` are regenerated from it with the alpha channel stripped (iOS rejects app icons carrying alpha).
- `Mascot` called `Image.resolveAssetSource`, which react-native-web does not implement — it threw during render and took the whole hub down, leaving a blank page on web. The call is now guarded, falling back to the bundler's asset URL.
- `withAlpha()` now returns `hsla()` for the `hsl()` colours `proximityColor()` produces, instead of concatenating a hex alpha suffix onto them. The old result (`hsl(...)29`) was an invalid colour that renders fully opaque rather than failing loudly, which made every Clueless guess-row rank badge draw its text in the same colour as the pill behind it — the rank and `COLD` labels were invisible. Covered by new `withAlpha` tests; the hex path is unchanged.

### Security
- Untracked `.env` from git before Supabase keys could be pushed; added `.gitignore` + `.env.example`
- Normalized malformed `open_ai_api ` env line (space before `=` made the key unparsable) to `OPENAI_API_KEY`

## [0.0.0] - 2026-08-16

- Repo created.
