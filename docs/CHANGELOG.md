# Changelog

All notable changes to WordKrush. Format follows [Keep a Changelog](https://keepachangelog.com); versions follow semver and match `version` in `package.json` / `app.json`.

Rules:
- Every PR is a version. Add a new `## [x.y.z] - YYYY-MM-DD` section at the top and bump `package.json` + `app.json` to that same number. Patch by default; minor or major when the change warrants it.
- Do not keep an `[Unreleased]` bucket. Do not add features or dates to a version that already shipped. Merging to `master` (or pushing tag `v<version>`) publishes the GitHub Release from that section. Then `eas build --platform ios` → TestFlight when native is in play.

## [0.8.29] - 2026-08-31

### Added
- **Clueless Daily Vault level 30: Measured Moment.** One reviewed future solo level extends the bundled Daily Vault buffer. No hint is shown; the theme stays sealed until players reach it. Native installs receive it with the next shipped build.

## [0.8.28] - 2026-08-30

### Fixed
- **Leftover crew memberships no longer block create or join.** C-94 dropped the crew-home screen, so `TeamsScreen` stopped loading the player's crew — but existing memberships stayed on the backend. A player who already owned or belonged to a crew hit "Already on a team" on Create room with no UI left to leave or disband. Create and join now clear the stale membership first through `clearExistingMembership`, the same owner-disbands / member-leaves rule the results screen already applied on rematch. Owners disband because the server rejects a leave from the owner (error 0007); members leave. The escape covers all three entry points: Create room, Join with a code, and auto-join from an invite link. No crew-home screen returns and `TeamsScreen` still does not load a crew on mount.

## [0.8.27] - 2026-08-30

### Fixed
- **Share result no longer crashes in the browser.** Replaced Node `Buffer` with browser-compatible APIs (`TextEncoder`/`TextDecoder` + `btoa`/`atob`) in `src/games/share-data.ts` so `encodeShareData` and `decodeShareData` work on web clients. Expo web has no Buffer; the ReferenceError left the clipboard empty. Server code (`og-image.mjs`, `serve.mjs`) still uses Buffer where appropriate.
- **Share link Open Graph images now render readable Fredoka text.** The server installs Fredoka SemiBold TTF via fontconfig at startup (copied to `$TMPDIR/wordkrush-fonts` with fonts.conf) so librsvg/pango can render SVG text elements as "Fredoka SemiBold". All three games (More or Less, Clueless, Wordfall) show the correct title, stats, and standing instead of .notdef glyphs. Railway's sharp no longer depends on preinstalled system fonts.
- **Share paste URLs are now dynamic `/share/:id` links, not the homepage.** Removed the homepage fallback in `composeShare()` so clipboard and native share always paste `https://wordkrush.com/share/:id?utm_source=player&utm_medium=share` with encoded result data. X/Twitter unfurls the per-result OG image instead of the generic lockup. `ShareBlocks.url` is now required.
- **Share result HTML strips homepage Open Graph tags.** `/share/:id` HTML removes all `og:*`, `twitter:*`, and `canonical` tags from index.html before injecting per-result tags, so scrapers only see the 1200×630 result PNG (not the 1024×1024 homepage lockup). Invalid share IDs return HTTP 404 instead of falling through to the SPA homepage.

## [0.8.26] - 2026-08-30

### Changed
- **Teams are now disposable race rooms.** The team loop is simplified to Create/Join → select game → open lobby → race → results → back to create/join. Rooms are single-use: after a race finishes, the entire team roster is released. When any player taps "Back to team" on results, the code loads the current team and checks if the player is the team owner (`team.ownerId === profile.id`). The team owner calls `disbandTeam()` (which removes all members), while non-owners call `leaveTeam()`. This ensures the next create/join operation for any finisher starts fresh without "Already on a team" errors, even after joiner-hosted races. Rematch always creates a new room. Persistent crew homes, rename team, and disband/leave operations are removed from the UI. The invite code is displayed prominently after room creation to make inviting teammates the primary action. Game selection shows only titles without level pickers.
- **Race-intent sign-in path.** "Race with team" on game start screens and the "Sign in" button on the Teams wall both show "SIGN IN TO RACE" copy, explaining that racing requires an account so teammates can see who they're racing with. "Back to solo play" returns to the game start screen (using the active game instead of always defaulting to Wordfall). After completing sign-in, players land directly in the create/join room screen.
- **Closed drawer no longer intercepts clicks.** Fixed pointer events so a closed navigation drawer does not capture taps or offset the hub layout.
- **"Race with team" button is now scrollable on start screens.** The button is no longer clipped under the fold on More or Less and Clueless game start screens.

## [0.8.24] - 2026-08-30

### Added
- **Per-result Open Graph previews on share links.** Share URLs now carry encoded game result data (`/share/:id`) and serve dynamic 1200×630 spoiler-free OG images as PNG (X/Twitter requires rasterized images). More or Less shows the green/red grid and streak, Clueless shows the heat spread (cold → hot buckets) and guess count, Wordfall shows the length-coded grid and score. Never answers, guessed words, or item labels. The server (`server/serve.mjs`) handles `/share/:id` HTML with injected OG tags and `/share/:id/og.png` image generation via sharp. Share paste still carries the same emoji grid plus the new dynamic URL (`buildShareUrl`). OG description uses the standing share line (Streak N / Found it in N / score + word count) instead of generic text.

## [0.8.23] - 2026-08-30

### Fixed
- **More or Less team races no longer hang when a player fails.** When a player guessed wrong, the game waited 1.6s before signaling done to the backend. If the timeout was cancelled (component unmount, re-render), the player's status stayed `racing` instead of transitioning to `done`, leaving teammates waiting forever. The fix adds an `onDone` callback that fires immediately when the game status becomes `over`, posting `done=true` to the backend before the visual timeout. This ensures failed players always signal completion, allowing the race to finish normally.

## [0.8.22] - 2026-08-30

### Changed
- **Judgment work for the product is a named Grok-bot fleet**, catalogued in `docs/AGENT-OS.md`. Cursor Cloud Agents plus `.cursor/skills/` own content authoring, organic X growth, QA, and product health. GitHub Actions still run CI, Railway deploy, GitHub Release, Wikipedia rotate, Resend send, and CI-gated content merge. A bot does not replace those jobs and does not push to `master`.
- **Acquisition in this operating system is organic X only** (@WordKrushGame). Reddit posting and Devvit launch are parked; the `reddit/` app and `.cursor/skills/reddit-ad-posts/` remain in the repo and are not scheduled. Player email stays a Tuesday retention Broadcast, not a second campaign.

## [0.8.21] - 2026-08-30

### Changed
- **In-app feedback now goes to PostHog Surveys.** The drawer **Send feedback** entry opens a WordKrush prompt (bug / suggestion / other plus a short note) on web and native. Responses land on the existing PostHog project as `survey sent`. Signed-in reports still carry account id, username, and email so a reply can reach them; guests stay anonymous. Sending feedback does not require analytics consent. Userback and its floating launcher are gone, including screenshot annotation.

## [0.8.20] - 2026-08-30

### Changed
- **Tuesday player-email draft uses OpenRouter.** The weekly job posts once to `OPENROUTER_BASE_URL` (default `https://openrouter.ai/api/v1`) with `OPENROUTER_API_KEY` instead of failing closed on a missing `OPENAI_API_KEY`. A failed model call still falls back to the deterministic changelog draft. Validator OpenAI use is unchanged.

## [0.8.19] - 2026-08-30

### Added
- **Spoiler-free result share** on More or Less game over, Clueless solve, and Wordfall win or loss. Each paste is an emoji grid plus a standing line and `wordkrush.com` with `utm_medium=share`. Native uses the system share sheet; web uses Web Share with a clipboard fallback and a “Copied to clipboard” note. No new dependency. `result_shared` records only a completed share or copy.
- **Clueless Daily Vault level 29: Departure Board.** One reviewed future solo level extends the bundled Daily Vault buffer. No hint is shown; the theme stays sealed until players reach it. Native installs receive it with the next shipped build.
- **Branded search surface.** `build:web` now writes `robots.txt`, `sitemap.xml`, a crawler-readable title and JSON-LD, and hub copy inside `#root` / `<noscript>`, so Google can index wordkrush.com as the word-game hub rather than a JS shell. Search Console’s HTML verification file is served at `/googled8072618779c67b2.html`.

## [0.8.18] - 2026-08-28

### Added
- **Clueless Daily Vault level 26: Quiet Power.** One reviewed future solo level extends the bundled Daily Vault buffer. No hint is shown; the theme stays sealed until players reach it. Native installs receive it with the next shipped build.
- **Clueless Daily Vault level 27: Far Signal.** One reviewed future solo level extends the bundled Daily Vault buffer. No hint is shown; the theme stays sealed until players reach it. Native installs receive it with the next shipped build.
- **Clueless Daily Vault level 28: Crossing Line.** One reviewed future solo level extends the bundled Daily Vault buffer. No hint is shown; the theme stays sealed until players reach it. Native installs receive it with the next shipped build.
## [0.8.15] - 2026-08-29
## [0.8.17] - 2026-08-29

### Changed
- **Recurring content auto-merge** now treats `automation:auto-merge` as the readiness signal: eligible Clueless and Wordfall drafts are marked ready, then merge only after exact-head CI succeeds.
- **GitHub Actions runtimes** use Node 24-native action releases instead of the deprecated Node 20 compatibility path.

### Fixed
- **Clueless solved screens now show the next step.** Intro levels direct players back to their unlocked path, while the final Spark and Daily Vault confirm when tomorrow’s puzzle opens.
## [0.8.14] - 2026-08-28

### Added
- **Wordfall weekly buffer** adds levels 12–15: Vowel Vault (31 Aug), Sixth Sense (7 Sep), Redline (14 Sep), and Cratework (21 Sep).

## [0.8.13] - 2026-08-26

### Added
- **Clueless Daily Vault level 24: Stable Ground.** One reviewed future solo level extends the bundled Daily Vault buffer. No hint is shown; the theme stays sealed until players reach it. Native installs receive it with the next shipped build.
- **Clueless Daily Vault level 25: Pressure Point.** One more reviewed future solo level extends the bundled Daily Vault buffer. No hint is shown; the theme stays sealed until players reach it. Native installs receive it with the next shipped build.

## [0.8.12] - 2026-08-25

### Changed
- **CI-gated recurring content merges.** Non-draft Clueless Daily Vault and
  Wordfall weekly PRs from their named content branches carry
  `automation:auto-merge`; GitHub merges them only after CI succeeds for the
  exact current head. Wikipedia content remains human-reviewed.

## [0.8.11] - 2026-08-25

### Changed
- **Wordfall weekly authoring** now maintains four future Monday levels through a standing human-reviewed `content/wordfall-weekly` review branch instead of requiring a task card per level.

## [0.8.10] - 2026-08-25

### Added
- **Clueless solo path.** First Spark begins with a hint, Follow the Heat earns one after 15 valid guesses, and No Map removes it. Clearing a level opens the next tutorial step or schedules one Daily Vault for the player’s next local midnight.
- **Spoiler-safe Daily Vault content.** Solo and team races now use disjoint bundled answer streams. The first 20 future vaults ship with the app, including occasional reviewed Clue Drops.
- **Cache-backed Daily Vault authoring.** The validator appends one eligible, semantically distinct puzzle without a runtime model request, and the committed daily-authoring contract prepares a human-reviewed `content/clueless-daily` PR.

### Changed
- Clueless leaderboards label retained score partitions by assistance received rather than a player-selected difficulty. Historical Standard rows remain comparable.

## [0.8.9] - 2026-08-25

### Fixed
- **Wordfall’s Stretch level now counts four-letter words and longer.** Its brief and goal chip agree; longer words still score more, while special tiles keep their existing trigger rules.

## [0.8.8] - 2026-08-25

### Fixed
- **Wordfall traces on laptop and iPad web instead of selecting tile text.** The board captures the responder at its boundary and disables browser text selection, touch callouts, and touch actions only inside the board. Phone tracing is unchanged.

## [0.8.7] - 2026-08-25

### Changed
- **A live race now holds 2–10 players, not 2–4.** The start screen, Teams, and lobby say so. Same private team, same invite, same dual unlock. Apply `0008_live_roster_ten.sql` if 0006 is already on the project (D-055).

## [0.8.6] - 2026-08-25

### Added
- **Tuesday player email is this week’s changes, not a static roundup.** `pipeline/player-email.ts` reads player-facing bullets from `docs/CHANGELOG.md` (last 7 days) plus this week’s Wordfall drop, asks OpenAI once for player-voice copy, and personalizes with Resend merge tags (`{{{contact.first_name|there}}}`, `{{{game|the games}}}` from the latest `global_scores` row). The letter shows a real in-game picture — Wordfall key art when a drop is live, otherwise Clueless / More or Less art or a hub screenshot — hosted at `https://wordkrush.com/email/` after the web build copies `assets/games/` and `assets/email/hub.png`. Quiet weeks skip. Broadcast name is `WordKrush weekly YYYY-MM-DD` (that Monday) so the same letter is not sent twice. `OPENAI_API_KEY` lives on GitHub Environment `best-games` next to Resend/Supabase; a failed call falls back to a deterministic draft of the same facts. Still never Railway / `EXPO_PUBLIC_*` (D-054). The branded shell at `supabase/templates/whats-new.html` remains as a one-off template, not the weekly send.

## [0.8.5] - 2026-08-25

### Added
- **More or Less label rounds.** Solo play is no longer one eternal set of 50 Wikipedia names. Each round is a queued set; see every name to unlock the next. Streak is still this run; **rounds passed** is how many sets you have cleared. The start screen says so in one line, the HUD shows `SEEN n/m`, and scores/hub show the counter. New sets are sampled weekly from a pipeline-only reservoir of 14,112 filtered Wikimedia titles (short of 20k without padding) and only *enqueued* — the calendar does not swap the set you are on. Reddit still plays the newest published round so a post stays shared.

## [0.8.4] - 2026-08-25

### Fixed
- **Typed text in `TextField` now uses Fredoka**, matching the Guess button and the rest of the UI. The input had size and weight but no `fontFamily`, and on web RN-web's `font: 14px System` reset was also eating the longhand, so the focused field fell back to the system sans (D-030).
- **The inner focus rectangle around a guess field is gone.** Chrome/Safari paint a sharp ring on the `<input>` (`:focus-visible`) that sits inside the rounded shell — orange first, then white. Focus still shows as the game-accent shell border.

## [0.8.3] - 2026-08-25

### Added
- **Teams are now CRUD, not create-and-stuck.** The owner can rename or disband the crew; a member can leave. Disband and leave ask for a second tap. Needs `0007_team_crud.sql` on the project (after `0006`).

### Fixed
- **Phone chrome fills the phone; laptop chrome is a laptop column.** The 460×900 fake-phone frame is gone. Below 720px the shell is full-bleed. At 720px and up it is a centered 1080px column. Hub cards sit in a row on a laptop. Teams split roster/manage on the left and the level list on the right.
- **The phone web hub no longer clips the streak or buries Wordfall under the deer.** The game list is the only scrolling region (`flex: 1; height: 0` on RN-web); the deer sits at the end of that list and **View your scores** stays a footer. The TopBar already carries the lockup, so the hub dropped the duplicate WordKrush heading.
- **Teams titles sit below the top bar**, not in it. Create/join and roster screens now pad the `ScreenHeader` the same way other chrome screens do.
- **The team race picker no longer sits under Host / Join on a phone.** Roster and manage scroll in a capped pane, the level list uses the leftover column, and Host / Join stay a footer. Title chips share one row instead of stacking as full-width buttons.
- **The hub deer is no longer a white rounded plate.** `Mascot` plays only the bundled `.lottie` (white backdrop layer already stripped). A miss is an empty slot rather than the lottie.host copy, which still has that full-canvas white shape. The player is clipped to the 4:3 slot.
- **Mobile browser chrome no longer eats the top of the app.** The web shell uses the visible viewport (`100dvh`) and ink behind the letterboxed laptop column.

## [0.8.2] - 2026-08-25

### Changed
- Wikipedia popularity snapshot refreshed (`wikipedia-pageviews:20260201-20260731`)

## [0.8.1] - 2026-08-25

### Fixed
- **Weekly Wikipedia popularity cron no longer fails `check:docs` on its own version bump.** The job writes a new changelog section and patches `package.json` / `app.json` (D-041), then runs `npm run check` on that dirty tree. The docs audit treated those manifests as a stack/system change, so it demanded HOW-IT-WORKS and STACK for a content snapshot. A version-only bump now counts as changelog only (D-049).
- **A Wikimedia image 429 no longer looks like a picture change.** Thrown image fetches keep the previously shipped URL instead of blanking the card, so a rate-limit cannot open a PR that strips dozens of images.

## [0.8.0] - 2026-08-25

### Added
- **Signed-in players can form a private team and race any title live.** Create or join with a 6-character invite, pick a numbered path row, ready up with 2–4 people, and play the same seed against a shared clock. Ranking is each player's own score — streak, guesses used, or Wordfall points — not a combined team total.
- **Team and personal path cursors move independently.** Completing a live row unlocks the next slot for the team if anyone finished it, and for a player only if they finished it. Guests and solo Play are unchanged, including Clueless daily.
- **More or Less has a bundled 10-level team path.** Solo Play stays the endless Wikipedia run. Live rows set a target streak and may start on a tighter fairness band. Clueless team races use existing puzzles except today's daily so the secret stays unspoiled.

## [0.7.0] - 2026-08-24

### Added
- **Clueless now has Easy, Standard, and Expert daily modes.** Easy opens with a reviewed thematic sentence, Standard reveals the same sentence after 15 valid unique guesses, and Expert never shows it. The answer, ranked meaning trail, unlimited guesses, and one-puzzle-per-day cadence are unchanged.
- **Daily mode locking keeps the challenge honest.** Players can change mode until the first valid guess; rejected and repeated words do not count or lock anything. Leaving and returning restores the locked mode, while sessions saved before this release resume as Standard.
- **Scores are comparable within difficulty.** Local and global Clueless boards can switch between Easy, Standard, and Expert. The stable `clueless` game id remains; migration `0005_clueless_difficulty_leaderboards.sql` maps historical rows to Standard and partitions global ranks by mode.

## [0.6.1] - 2026-08-23

### Added
- **Wordfall match juice: puff, then fall.** A valid word used to blink tiles off and spring the rest down. Cleared tiles now scale-fade with a short burst in place, gravity waits ~140ms, and a new special pops on its tile. A 2× chain stamps CRUSH and 3×+ stamps NOVA — our words, not Candy Crush's. Timing is UI-only over `lastPlay`; the reducer is unchanged. Lottie `crush-hit` / `crush-best` stay empty (ST-72).

## [0.6.0] - 2026-08-23

### Added
- **Players can send feedback from inside the game.** The web build now carries the Userback widget: a launcher on every non-game screen, plus a **Send feedback** entry in the drawer, opening a form that takes a bug report or a suggestion with an annotated screenshot. It disappears during a run — a floating button over a live board is a mis-tap waiting to happen — and comes back the moment the round ends.
- **Signed-in reports arrive with a name on them.** A player who is signed in is identified to Userback with their account id, username and email, so a reply can actually reach them, and it happens before the first report rather than a beat later: the widget waits for the session to restore instead of loading anonymous and re-identifying. Guests get the widget too and stay anonymous — inventing a stable id for them would turn a support tool into a tracker, which is not what the analytics consent covers (D-022). Signing out tears the widget down and rebuilds it anonymously, so the next person on a shared browser never signs a report with someone else's name.
- **Nothing is recorded.** The Userback SDK can start a session replay; this app never calls it. Nothing leaves the browser until a player types a report and presses send.

### Changed
- **The drawer's `FEEDBACK` heading now means the player's feedback.** The sound and vibration switches under it were never that — they are the game's *feel* — so they moved under `SOUND & VIBRATION`, which shortens to `SOUND` wherever `canVibrate()` says there is no vibration row to name.

## [0.5.1] - 2026-08-23

### Fixed
- **TikTok, Netflix, and PlayStation cards no longer render as a blank colour block.** Wikipedia `pageimages` only returns a freely-licensed lead image, so corporate articles whose infobox is a fair-use logo or screenshot shipped with no picture at all. The image builder now walks other files on the article and takes the first CC/PD photograph (headquarters, booth, hardware). Fair-use files are still rejected. Coverage is tested at the documented 90% floor (D-045).

## [0.5.0] - 2026-08-23

### Added
- **Vibration now works in the phone browser, not just the native app.** 0.4.0 shipped the haptics web twin as five empty no-ops, so the browser build had a sound half and no vibration half at all. The inherited reasoning was that the Vibration API is "unsupported in Safari and feels wrong on a laptop" — both true, and neither one a description of Android Chrome on a phone, which supports `navigator.vibrate` and where a buzz is exactly right. Capability is now detected (`navigator.vibrate` plus `(pointer: coarse)`) instead of assumed: Safari, every iOS browser, and desktops still get nothing, but they get it by being asked rather than guessed at (D-044).

### Changed
- **The drawer's vibration switch is gated on capability, not on platform.** It appears wherever a buzz can actually fire — always on native, and on web only for a capable touch device — so it is never a control that does nothing.

### Fixed
- **`src/native/` test files were never being collected.** The directory matched no pattern in `vitest.config.ts`, the same trap the daily-streak suite was in before 0.4.0. Added the pattern along with 10 tests covering the vibration gate (Safari, laptop, a throwing `matchMedia`, absent `navigator`) and the buzz patterns themselves.

## [0.4.0] - 2026-08-23

### Added
- **The games have a voice.** Five game moments now fire a sound and a haptic together: a correct guess or valid word, a wrong guess or rejected word, each letter joining a Wordfall trace, a level cleared, and a run won. The four supplied clips live in `assets/sounds/` and are bundled, so audio never waits on the network (D-004 holds). Winning a level plays the level fanfare rather than the generic "correct" beat, and More or Less celebrates only a **personal best** — replaying a fanfare over an ordinary loss reads as sarcasm.
- **Sound and vibration switches in the drawer.** Both default to on and persist per device. Flipping one on immediately plays what it just enabled, so the switch proves itself. The vibration row is hidden on web, where haptics are a deliberate no-op — a switch that visibly does nothing is worse than no switch.
- **The iOS silent switch still works.** Audio mode is set to respect hardware mute and to mix with other audio, so a phone on silent stays silent and someone playing over their own music keeps their music.

### Changed
- **Screens name the moment, not the effect.** `src/native/feedback.ts` maps `feedback('levelUp')` to a clip plus a haptic in one table; the three game screens no longer reach for `tapCorrect`/`tapWrong` directly. Retuning the game's feel is a one-line edit in that table instead of a hunt across screens, and the mute switches are enforced in one place instead of at every call site (D-043).
- **Wordfall's per-letter tick is driven by the reducer, not the gesture.** The trace tick fires when the selection actually grows, rather than on `onTrace`, which fires on every pointer move that lands on a tile — including the one already under the finger.

### Fixed
- **`npm test` no longer needs `reddit/node_modules` to be installed.** The Reddit app's route suite imported `hono` directly, which only exists in `reddit/package.json` — so it passed locally and failed CI, where only the root tree is installed. `hono` is now a root devDependency pinned to the version the Reddit app ships; it is deliberately *not* aliased to a fake, because the route tests exercise the real router.
- **The daily-streak test suite was never running.** `src/streak/types.test.ts` had existed since the streak shipped but matched no pattern in `vitest.config.ts`, so it was silently collected by nothing. It is now included, along with the new settings suite — `npm test` goes from 35 files to 37.

## [0.2.0] - 2026-08-23

### Added
- **More or Less now runs inside a Reddit post.** A new Devvit app in [`reddit/`](../reddit/README.md) posts one challenge a day; everyone on that post plays the same questions, the streak lands on the day's board, and the result is a spoiler-free grid built for the comments. No link-out, no install, and no Apple Developer Program — it plays in the Reddit app on every phone. The choice of game is deliberate: a daily *word* puzzle would have its answer posted in the comments within minutes, while More or Less has nothing to spoil and produces arguments instead (D-042).
- **One engine, two surfaces.** The Reddit app imports `src/games/more-or-less/engine.ts` and `wikipedia-popularity.json` rather than copying them, so a fairness or difficulty change lands on both. `reddit/tools/tsconfig.shared.json` names every file that crosses the boundary and fails the build if a new one appears; the root `npm test` runs the Reddit app's tests alongside the Expo app's — its pure layer directly, and its server routes against an in-memory Devvit stand-in so CI needs no second dependency tree.
- **A leaderboard that cannot be asserted.** The Reddit server never sends the seed or a hidden value and never asks the client what it scored — the browser posts one word per round and the server judges it. Verified by the build: neither client bundle contains the pool, the values, or the engine (the feed view is 1.5 KB). Only a player's first completed run is recorded, because everyone shares a sequence and a replay already knows the answers. This is the problem [SEC-01](security-and-anti-cheat/THREAT-MODEL.md#sec-01--the-global-leaderboard-accepts-any-number-a-client-sends--critical) records for the Expo global board, absent on this surface.
- **The weekly snapshot is now a daily content calendar.** A Devvit cron task posts at 13:00 UTC using a date-derived seed, so D-036's Monday Wikipedia refresh feeds seven posts without anyone deciding what to post. Creating a post is idempotent per calendar day, so the cron task, the moderator menu item and the install trigger cannot split a community's board across two posts.

### Changed
- **The documentation audit covers `reddit/`.** Server, shared-engine and `devvit.json` changes require `HOW-IT-WORKS.md`; toolchain and Devvit config changes require `STACK.md`; anything player-facing requires this file.
- **`tsc --noEmit` no longer walks into `reddit/`.** That project needs the `browser` resolution condition for `@devvit/web/client`, which the Expo config resolves as `react-native`. Typecheck it with `npm run reddit:types`.

## [0.1.1] - 2026-08-23

### Added
- **Arrival attribution on consented opens.** `app_opened` now carries a bounded `entry_source` plus optional `utm_source` / `utm_medium` buckets and `has_utm_campaign`. Web first-paint (and native deep links that are not auth callbacks) also fire `landing_viewed`. Raw URLs, referrers, and campaign copy are never sent; magic-link callbacks are classified as `auth` and stop there.
- **Share-card Open Graph tags.** `build:web` copies `docs/marketing/reddits/assets/og-share.png` to `/og.png` and injects absolute `og:` / `twitter:` tags so a pasted wordkrush.com link shows the Wordfall still instead of a blank card.

### Changed
- **Changelog is one version per PR.** Each pull request adds a new `[x.y.z]` heading and bumps `package.json` / `app.json`. There is no `[Unreleased]` bucket, and shipped headings are not edited in place.
- **Game start screens read as one card instead of two.** The `detail` block (today’s category / puzzle / week) and the player’s stats now share a single status card, and the stats stay hidden until a run has actually been finished — a first-time player was shown a full-width accent card whose whole content was “—” and “0”. Two layout bugs went with it: `hero` added its own horizontal inset on top of the root gutter, so the detail card and the stats card sat at different widths, and the fixed column let the bottom block ride up over the detail card whenever the blurb wrapped to three lines (Clueless, and every game on a short phone). The screen is now a ScrollView with `flexGrow: 1`.
- **Consented sign-up now creates a PostHog person.** After opt-in, sign-up and sign-in identify the player with their account id, username, and email so they show up in PostHog. Guests stay anonymous. The consent prompt and menu copy say this, and the stored consent key is bumped so earlier anonymous grants are asked again.

## [0.1.0] - 2026-08-22

### Fixed
- **Shared links preview the WordKrush lockup, not a generic globe.** Expo’s web export still emits no Open Graph tags. `scripts/patch-web-head.mjs` copies `assets/logo/wordkrush-lockup.png` to `dist/og-image.png` and injects `og:*` / Twitter card meta after `<title>` (absolute `https://wordkrush.com/og-image.png`). The tab favicon stays the tight W crop; that crop is too small for a large preview, so `og:image` is the full lockup.
- **Finder duplicate files no longer look like product changes.** macOS "Name 2.ts" copies and `supabase/.temp/` are gitignored so they cannot be committed and cannot trip `check:docs` as if `src/` or `supabase/` had changed.
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
