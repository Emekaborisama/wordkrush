# Stack

**Project:** WordCrush — cognitive and pattern-recognition games for iOS and web.
**Status:** Foundation scaffold, CI, and content pipeline are in place; the game runtime and UI are still under construction.
**Last updated:** 2026-08-22

This is a living document. Every stack change gets a row in the Decision Log at the bottom — including reversals. Do not silently rewrite a past decision; supersede it with a new entry so the reasoning trail survives.

---

## Current stack

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript | Strict mode. Non-negotiable for the game logic layer. |
| App framework | Expo (React Native) | Chosen over Capacitor — see D-002. |
| UI | React Native core components | No UI kit until a real need appears. |
| State | React state + a pure reducer | Game engine is a pure function; see `docs/BRAINSTORM.md`. |
| Source layout | One `src/games/` root with one directory per title | Shared game infrastructure stays directly under `src/games/`. See D-024. |
| Data (v1) | Static JSON bundled with the app | No backend. See D-004. |
| Unit tests | Vitest | Targets the pure logic layer only. |
| Build & signing | EAS Build (Expo cloud) | Removes manual cert/provisioning work. |
| Submission | EAS Submit → App Store Connect | |
| Distribution | TestFlight → App Store | |
| Targets | iOS + Web, one codebase | Via `react-native-web`. See D-006. |
| Product goal | Strengthen cognitive skills and pattern recognition through repeated play | Player promise: "Guess correctly, keep the streak alive, and beat your best score." See D-023. |
| Content DB | Supabase Postgres | Content **factory** only — never a runtime dependency of the app. See D-007. |
| Data sourcing | **Wikimedia pageviews** via `pipeline/sources/wikipedia.ts` | Free, measured, no auth. Resolves O-2. See D-012. |
| Pipeline runtime | Node + `tsx`, `npm run pipeline:*` | Reads `.env` locally; scripts in `pipeline/`. |
| CI | GitHub Actions | Documentation impact + typecheck + tests on every push/PR (`.github/workflows/ci.yml`). |
| Documentation drift | Dependency-free Node audit + Cursor stop hook | Detects missing path-based documentation updates locally and in CI; never generates prose. See D-022. |
| Web hosting | **Railway** — project `best-games`, service `web` | Auto-deploys from CI on green `master`. Railway runs `npm run build:web` and serves `dist/` via `server/serve.mjs`. Config in `railway.json`. See D-020. |
| Product analytics | PostHog React Native, anonymous and explicit opt-in | Typed events behind `src/analytics/`; no PII, account identification, autocapture, person profiles, feature flags, exception capture, or session replay. See D-022/D-024. |
| Content validation | Python 3.13 + Pydantic v2 + FastAPI + OpenAI structured outputs (`validator/`) | Offline **playability** referee, never a game runtime dependency. See D-010, D-014. |
| Task board | Superthread — *BestGame* board | Board of record for status; cards follow the task contract in [WORKFLOW.md](WORKFLOW.md). [ROADMAP.md](ROADMAP.md) mirrors the work for repo-only readers. See D-011/D-015. |

## Local environment

| Tool | State as of 2026-08-16 |
|---|---|
| macOS | Darwin 25.6.0 |
| Node | v25.2.1 |
| npm | 11.6.2 |
| Xcode | **Downloading** — not yet installed. `xcodebuild` absent, no simulator runtimes registered. |
| Apple Developer Program | Not yet purchased. $99/yr, required to submit. |

### Post-install steps for Xcode

```bash
sudo xcode-select --switch /Applications/Xcode.app
sudo xcodebuild -license accept
xcodebuild -runFirstLaunch
```

Then open Xcode once and download a simulator runtime via Settings → Components. The App Store download does not reliably include one, and it is a separate multi-GB fetch.

## Testing strategy

Four rungs, cheapest and fastest first. Most work happens on rungs 1–2.

1. **Vitest on pure game logic** — pairing, scoring, streak, difficulty. No React, no native, no I/O. Runs in milliseconds. This is where real coverage lives.
2. **Expo Go on a physical iPhone** — `npx expo start`, scan QR, hot reload. The daily feel-it loop. No Xcode required.
3. **iOS Simulator** — screen sizes we don't own, safe-area/notch behavior. Requires Xcode.
4. **TestFlight** — real testers, real builds, real devices.

Xcode is deliberately *not* on the critical path: EAS builds run in Expo's cloud, and day-to-day testing runs through Expo Go.

## Constraints that shape the stack

- **App Store Guideline 4.2 (minimum functionality).** Apple rejects apps that are a website in a wrapper. This is the single biggest reason we are not using Capacitor. To stay clearly on the right side of it, v1 should ship at least: offline play, haptic feedback, and a native leaderboard (Game Center).
- **No backend in v1.** Bundled data means zero hosting cost, zero latency, offline play, and deterministic tests. It also means content updates require an app release — accepted for now, revisit at D-004.
- **The logic layer must never import React or React Native.** It is plain TypeScript so it stays testable in Node and portable if the UI layer ever changes.

## Open decisions

| # | Question | Blocking? |
|---|---|---|
| ~~O-1~~ | ~~Which category ships first?~~ | **Resolved 2026-08-16: Wikimedia pageviews ("Popularity"), owner's call.** More categories later. |
| ~~O-2~~ | ~~Which real data source for search volume?~~ | **Resolved 2026-08-16 → D-012: Wikimedia pageviews.** Paid keyword APIs remain a later upgrade if true Google volumes justify the cost. |
| ~~O-6~~ | ~~Web host for the static export?~~ | **Resolved 2026-08-18 → D-020: Railway**, owner's call. Live at `https://web-production-548e8.up.railway.app` |
| O-3 | Lives (3 hearts) vs. single-life endless streak? | No — engine supports both |
| ~~O-4~~ | ~~Does the app need a web build too, or iOS only?~~ | **Resolved 2026-08-16 → D-006: both, one codebase** |
| O-5 | Monetization: ads, IAP, or free? | No — out of scope for v1 |

## Decision log

| ID | Date | Decision | Rationale | Status |
|---|---|---|---|---|
| D-001 | 2026-08-16 | TypeScript everywhere | Shared language across logic, UI, and tooling; the logic layer needs static types to stay refactorable. | Active |
| D-002 | 2026-08-16 | Expo (React Native) over Capacitor, Swift, and Phaser | Capacitor renders a WebView → real Guideline 4.2 rejection risk, plus manual signing. Swift means learning a new language mid-project. Phaser is a canvas engine and would need a WebView anyway. Expo gives real native UI, automated signing via EAS, and instant device testing. | Active |
| D-003 | 2026-08-16 | EAS Build + EAS Submit for the release pipeline | Code signing and provisioning are the hardest part of shipping to the App Store, and EAS automates both. Cloud builds also keep Xcode off the critical path. | Active |
| D-004 | 2026-08-16 | v1 data is static JSON bundled in the app | No backend to run or pay for; enables offline play (helps the 4.2 case) and makes tests deterministic. Cost: content updates need an app release. | Active — revisit when content churn becomes painful |
| D-005 | 2026-08-16 | Vitest over Jest | Faster, native ESM and TypeScript, and we only test the pure layer so React Native's Jest preset buys us nothing. | Active |
| D-006 | 2026-08-16 | Ship iOS **and** web from one Expo codebase via `react-native-web` | `src/game/` and `src/data/` are already platform-free, and the UI is simple enough that RN primitives map cleanly to DOM. Adds a fast browser testing loop that needs neither simulator nor phone. Cost: larger bundle and weaker SEO than a purpose-built web app — acceptable for a game behind a Play button. Split into a monorepo (shared logic package + Next.js web) only if web becomes a marketing/SEO surface. | Active |
| D-007 | 2026-08-16 | Supabase Postgres is the content **factory**, not a runtime dependency | Owner supplied Supabase keys and proposed batch-validating data into Postgres — adopted, with one boundary: the app still ships bundled JSON snapshots (D-004 stands). DB holds full provenance (snapshots, raw responses, flags); app gets a clean export. Preserves offline play, zero client keys, deterministic tests. Supabase may later serve leaderboards/daily challenges — separate decision. | Active |
| D-008 | 2026-08-16 | Data sources are pluggable adapters; ship the pipeline on a deterministic mock first | There is **no official public Google search-volume API**, so the source choice (O-2) involves cost/licensing trade-offs the owner must make. The adapter interface (`pipeline/sources/types.ts`) makes that choice a one-file swap instead of a blocker: the whole ingest→validate→store→export chain is provable end-to-end today with mock data. | Active |
| D-010 | 2026-08-16 | LLM (OpenAI) is a **referee** over content, never a source of search-volume numbers | Owner proposed OpenAI for validation — adopted, with a hard boundary. Models hallucinate absolute figures ("pizza gets 3.2M searches") with total confidence, so asking for numbers would manufacture fake facts and then validate them circularly. Relative pairwise judgement ("is pizza searched more than sushi") is a different task models are genuinely good at. So: constrained enum schema, both orderings checked for position bias, flag only confident contradictions with our data. Python chosen over TS here because Pydantic + OpenAI structured outputs is best-in-class and the pipeline is language-independent from the app. | Active |
| D-012 | 2026-08-16 | **Wikimedia pageviews is the v1 data source**; the metric is "monthly Wikipedia pageviews", never "Google searches" | Owner asked whether a web-search-grounded LLM could supply real numbers. Tested, not assumed: a bare prompt returned a stable 13.6M for "pizza", but demanding a citation made two runs disagree on every one of five terms, and the stable figure traced to an SEO farm quoting **Etsy** keyword data. Web search relocates the failure from hallucination to garbage-in. Wikimedia instead publishes *measured* pageviews — free, no auth, CC-licensed, batch-friendly. Cost: pageviews track encyclopedic, not commercial, interest, so the label must state exactly that. Enforced by a test asserting no category claims "Google". | Active |
| D-013 | 2026-08-16 | Median monthly pageviews over 6 **complete** months, not mean | Found by inspecting real output. (1) Including the in-progress month pulled in a partial count (August showed 33,711 on day 16), deflating every item by an amount depending on the run date. (2) Pageviews spike hard on events — Messi hit 5.85M during the 2026 World Cup vs a ~500K baseline — and the mean let one month define an item for the whole window. Median reports a typical month and ignores the tail; sustained shifts (Michael Jackson's 3-month biopic elevation) still come through, which is correct. | Active |
| D-014 | 2026-08-16 | Keep the OpenAI validator, but narrow its job from **truth-checking** to **playability-checking** | With Wikimedia (D-012) the numbers are measured truth for their own metric, so there is nothing left for an LLM to "verify" — asking it to would be theatre. Its remaining job is real and different: pageviews are a *proxy* for popularity, and where the proxy diverges from what a player would expect, the card is unfair even though the data is correct. The LLM is a cheap stand-in for player intuition; a confident LLM/data disagreement means "this pair will feel wrong", not "this number is wrong". The `bitcoin vs sushi` WARN in the smoke suite is the standing example. Also still earns its keep on mis-resolved articles (e.g. a title that means something else to players). | Active |
| D-011 | 2026-08-16 | Superthread *BestGame* board is the task board of record; `docs/ROADMAP.md` mirrors it | Owner's call. Board holds live status; the doc holds the work breakdown, blockers, and ordering so an LLM reading the repo cold needs no board access. Doc also records the Superthread API gotchas (team-scoped paths, required `project_id` query param, Cloudflare UA ban). | Active |
| D-015 | 2026-08-16 | Superthread cards use a compact agile task contract | Each card should state the outcome, context, scope boundaries, acceptance criteria, verification, and sign-off so collaborators can work without guessing or widening scope. Keep the board Kanban-style; no sprint ceremony required. | Active |
| D-021 | 2026-08-22 | Every feature and fix is a PR; the branch name is the Superthread card's `suggested_branch_name`; stacked PRs are allowed | Owner's call. Invented `feat/<slug>` names break the GitHub ↔ Superthread link (the card ID in the suggested name is what auto-links the branch and PR). Direct pushes of features or fixes to `master` skip review and that link. A follow-on task may target an unmerged parent branch instead of `master`, but each PR in the stack still uses its own card's branch name. | Active |
| D-022 | 2026-08-22 | Product analytics is anonymous and disabled until explicit consent; signed-in status may be measured, but PostHog is not joined to account identity | The goal is to improve every player-facing area without turning optional accounts into a tracking requirement. Bounded events and an `auth_status` cohort answer activation, retention, balance, and reliability questions while excluding email, username, profile ids, guessed content, autocapture, and session replay. This preserves offline play and keeps refusal consequence-free. True cross-device analytics would require a later decision covering linkage, deletion, and revised consent. PostHog is the proposed product-analytics destination, but SDK selection and deployment remain a follow-on implementation. See `docs/OBSERVABILITY.md`. | Active |
| D-023 | 2026-08-22 | The product brand is **WordCrush**, with the player promise "Guess correctly, keep the streak alive, and beat your best score" | The name now covers the comparison and word-game collection under one identity. The product purpose is to create engaging repeated play that strengthens cognitive skills and pattern recognition. Existing technical identifiers such as `more-or-less`, `bestgames.*` storage keys, the Expo slug, and the iOS bundle id remain stable so the branding correction does not lose scores or create a new deployed app. | Active |
| D-024 | 2026-08-22 | PostHog React Native implements the D-022 analytics policy through a typed, consent-gated adapter | The standalone client works across Expo native and web with the existing AsyncStorage dependency. It starts opted out, creates no person profiles, disables SDK lifecycle capture, remote flags, push capture, error autocapture, and session replay, and drops event names outside the documented dictionary. UI and persistence boundaries emit bounded properties; pure game reducers remain untouched. Railway and EAS receive only the public project token and ingestion host at build time. | Active |
| D-024 | 2026-08-22 | Keep one game-code root: `src/games/`, with one directory per title | The original More-or-Less engine predated the multi-game hub and lived in singular `src/game/`, while newer titles lived in plural `src/games/`. Co-locating each title's engine, types, persistence validation, and tests under its stable game id removes that ambiguity. Cross-game modules such as the registry, seeded RNG, and progress adapter stay directly under `src/games/` so one game never depends on another game's internals. | Active |
| D-018 | 2026-08-18 | Wordfall's word list is built from the **public-domain** Webster's 1913 (`/usr/share/dict/web2`), with inflections derived at lookup rather than stored | A word game lives or dies on recall: rejecting a word the player knows is the worst failure mode it has, so the accept list needs breadth we cannot hand-author. Webster's 1913 is public domain and ships with macOS/BSD, which settles the rights question that blocks most word lists (agents.md: no bundling without confirmed rights). It has one systematic gap — it lists lemmas, so "cat" is present and "cats" is not. Generating every inflection up front cost 995 KB of bundle for words nobody would ever trace; suffix-stripping at lookup gets the same words for 550 KB **and** better recall, since it also resolves forms a generator would not have produced. Remaining gaps (irregulars like "held"/"women", plus "box", plus the modern lexicon) are patched by a short hand-checked list. Cost: over-accepts at the edges ("informationed" resolves) — the correct direction to be wrong in. Build is `npm run pipeline:wordfall`; it reads local system files, so **its output is committed and CI never regenerates it**. | Active |
| D-019 | 2026-08-18 | Wordfall separates the **accept** list from the **everyday** list, and derives letter spawn weights and level targets from the latter | One word list cannot do both jobs. The board generator certifies a board by counting the words findable on it — if it counted Webster's obscurities it would happily certify boards whose only solutions are "aalii" and "abaft": solvable on paper, dead in the hand. So the solver and the rarity ranking use the ~6k frequency-ordered everyday words (reusing the vocab already bundled for Clueless rather than shipping a second one), while validation uses all 76k. The same everyday list supplies the measured per-letter spawn weights, so the board is stocked in the proportions real words actually use instead of a hand-tuned guess. Level score targets were then calibrated by simulating a perfect solver over many seeds — the first guesses were wrong in both directions and the data moved them. | Active |
| D-020 | 2026-08-18 | **Railway hosts the web build**, deployed from CI only after `check` passes, and served by a zero-dependency Node static server rather than a hosting platform's CDN defaults | Resolves O-6 (owner's call). Railway builds from source (`railway.json` → `npm run build:web`) so the deployed artifact is always reproducible from the repo, and `server/serve.mjs` is the ~150 lines that turn a folder of files into a process on `$PORT`. Written by hand rather than adding `serve` or similar, per the standing rule to prefer platform APIs — and because the two things that actually matter here need explicit control: the bundle is a single ~3 MB JS file, so it is pre-compressed with brotli at boot (2.89 MB → 0.77 MB over the wire), and Expo hashes that filename while `index.html` points at it, so the two need opposite cache policies (`immutable` vs `no-cache`). Getting the second one backwards pins users to a stale build after every deploy and fails silently. Deploy is gated on the `check` job because the definition of done is "npm run check green", and a host that ships a red build makes that a suggestion. Cost: one `RAILWAY_TOKEN` secret in GitHub. Alternative considered: Railway's GitHub App auto-deploy, which needs no secret but deploys regardless of test results. | Active |
| D-022 | 2026-08-22 | Enforce documentation impact with one dependency-free changed-file audit shared by local checks, CI, and a Cursor completion hook | Documentation had explicit update rules but still drifted because nothing enforced them. Automatic prose generation would manufacture decisions, while an edit-time hook would add noise and token cost. The audit therefore checks only the path-based minimum, reports the exact missing canonical document, and runs once at agent completion plus in `npm run check`. Semantic design and task-status impact remains a human/agent judgement. | Active |
| D-009 | 2026-08-16 | Deployment-first: scaffold + CI + EAS profiles + pipeline before features | Owner's call: all config up front so future work is features-only. GitHub Actions runs typecheck+tests on every push; eas.json defines dev/preview/production; release process documented in WORKFLOW.md. Remaining setup steps need owner accounts (Expo login, Apple Developer, Supabase migration, web host) — listed in WORKFLOW.md checklist. | Active |

## How to update this document

1. Add a new row to the Decision Log. Never edit an old row's rationale — if a decision is reversed, mark the old row `Superseded by D-0NN` and add the new one.
2. Update the **Current stack** table to match.
3. Update **Last updated** at the top.
4. If the change affects the game design, mirror it in `docs/BRAINSTORM.md`.
