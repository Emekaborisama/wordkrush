# WordKrush — Design Brainstorm

**Last updated:** 2026-08-25
**Status:** Design exploration. Nothing implemented yet.
**Audience:** Whoever (human or LLM) picks this up next. Read this before writing code.

---

## 0. Read this first — provenance and confidence

The reference the project owner gave is **https://lessgames.com/moreless**.

**I was not able to read that page.** It is a client-rendered SPA; fetching it returned only the string "More/less" and no gameplay content. A follow-up web search was declined. So nothing in this document is verified against the reference implementation.

Everything here derives from two sources:

1. **The owner's own description** (treat as authoritative): *"it shows you two items in a certain category and then you select the right one based on the popular."*
2. **Genre convention** for higher/lower comparison games (treat as an educated guess).

Claims are tagged:

- **[GIVEN]** — stated by the project owner. Reliable.
- **[ASSUMED]** — my inference from genre convention. Needs confirmation.
- **[OPEN]** — an unresolved question. Do not code past it without an answer.

If you can view the reference site, verify the **[ASSUMED]** items and log what you find in the Correction Log at the bottom.

---

## 1. The game in one sentence

Two items from the same category are shown; the player picks the one with the greater value of some "popularity" metric, and keeps going until they get one wrong. **[GIVEN]**

The player-facing promise is: **guess correctly, keep the streak alive, and
beat your best score.** The broader product goal is to create engaging word and
comparison games that strengthen cognitive skills and pattern recognition
through repeated play. **[GIVEN]**

## 2. Core loop

### The central design decision: carry-over vs. fresh pair

This is the most consequential mechanic choice and it should be settled before any code is written.

**Option A — Carry-over chain (recommended).** The winning item slides into the left slot, a new challenger appears on the right. One new item revealed per round.

```
Round 1:   [ Pizza  ]  vs  [ Sushi ? ]     player picks
           reveal → Pizza 3.2M, Sushi 1.1M → correct

Round 2:   [ Pizza  ]  vs  [ Ramen ? ]     Pizza carries over
           reveal → Ramen 890K → correct

Round 3:   [ Ramen? ]  ← wrong, chain broke.  Streak: 2
```

*Why it wins:* creates narrative momentum (the player watches a champion survive), halves the reading load per round, and stretches a small dataset much further — N items yield far more than N/2 rounds.

**Option B — Fresh pair each round.** Two new items every time. Simpler to implement, but each round is disconnected and it burns through the dataset twice as fast.

**Recommendation: Option A.** **[ASSUMED]** — this is the genre standard, but confirm against the reference. The engine should be written so the two are a config flag, not a rewrite.

### Round sequence

1. Left item shows its name, image, and **value revealed**.
2. Right item shows name and image, **value hidden**.
3. Player taps **MORE** or **LESS** (does the right item have more or less than the left?).
4. Right item's value **counts up/animates to its real number** — this reveal is the emotional beat of the whole game, do not skip it. **[ASSUMED]**
5. Correct → streak increments, right item carries left, new challenger enters.
6. Wrong → run ends. Show final streak, best streak, and a Play Again button.

> **Note on framing:** "MORE or LESS" (compare against the revealed left item) is a cleaner fit for the game's name than "pick the more popular one." Both are viable; the name suggests the former. **[OPEN]** — which framing does the reference use?

## 3. Data model

```ts
type Item = {
  id: string;            // stable, e.g. "food.pizza"
  categoryId: string;
  label: string;         // "Pizza"
  value: number;         // THE comparable metric
  imageUrl?: string;     // bundled asset or remote
  source?: string;       // attribution / provenance
  updatedAt?: string;    // ISO date — data goes stale
};

type Category = {
  id: string;            // "food"
  name: string;          // "Foods"
  metricLabel: string;   // "monthly searches"
  unit: 'count' | 'currency' | 'percent';
  items: Item[];
};
```

**The hard rule:** `value` must mean the same thing for every item inside a category. Comparing "monthly searches" against "population" is nonsense. Cross-category pairing must be structurally impossible — enforce it in the pairing function, not by convention.

## 4. Pairing algorithm — the actual heart of the game

Naive random pairing produces two failure modes that both feel terrible:

- **Near-ties.** Two items with nearly identical values make the answer a coin flip. The player feels cheated, not beaten.
- **Flat difficulty.** Round 40 is exactly as easy as round 1, so a run has no arc.

Both are solved by pairing on the **ratio** between values.

```
ratio = max(a.value, b.value) / min(a.value, b.value)
```

**Fairness guard:** reject any pair with `ratio < 1.15`. Too close to be a fair question.

**Difficulty curve:** narrow the target ratio band as the streak grows.

| Streak | Target ratio | Feel |
|---|---|---|
| 0–4 | ≥ 3.0 | Obvious. Builds confidence. |
| 5–9 | 2.0 – 3.0 | Comfortable. |
| 10–19 | 1.5 – 2.0 | Requires actual knowledge. |
| 20+ | 1.15 – 1.5 | Genuinely hard. |

If no candidate fits the band, widen it progressively rather than failing — never let the engine deadlock. **[ASSUMED]** — the bands are my starting numbers, not tuned. Expect to adjust after playtesting.

**Anti-repeat:** keep a `seenIds` set for the run and exclude recent items. If the pool is exhausted, reset the set but never allow the same item twice in a row.

**Determinism:** the pairing function takes a seeded RNG as an argument. This makes tests reproducible and enables a "daily challenge" mode later, where every player gets the same sequence.

## 5. Scoring

- **Streak** — consecutive correct answers. The primary score for a single run.
- **Best streak** — persisted locally, the thing players chase.
- **Label rounds passed** — how many Wikipedia name-sets the player has exhausted. A round is one queued set of labels. The set does not change until every name in it has been shown; the weekly pipeline only *enqueues* the next set. Separate from streak and from the cross-game daily flame. **[GIVEN]**
- **Lives** — **[OPEN]**. Single-life endless is purer and higher-tension; 3 lives is friendlier to new players. The engine should support both via config so it can be playtested rather than argued about.

## 6. Screens (v1, minimal)

1. **Home** — game logo, Play, best streak, category picker.
2. **Game** — the two panels, MORE/LESS buttons, current streak.
3. **Game Over** — final streak, best streak, the pair that ended the run, Play Again + Share.

Deliberately no settings, no accounts, no onboarding in v1.

### Clueless difficulty modes **[GIVEN — 2026-08-24]**

Clueless remains one secret word per UTC day, with unlimited guesses ranked by
meaning and fewer guesses scoring better. “Levels” means a daily difficulty
choice, not a campaign:

- **Easy:** a short thematic sentence is visible before the first guess.
- **Standard:** the same sentence appears after 15 valid, unique guesses.
- **Expert:** no sentence appears.

The first valid guess locks that day’s mode. Rejected and repeated words neither
advance the Standard threshold nor lock the choice. Scores and global ranks are
separate by mode; otherwise an opening hint would compete directly with an
unassisted run.

Hints are reviewed content, not runtime AI and not a nearest-neighbour guess.
They describe a context or association without including the answer, its
inflections, letter/length clues, or a direct synonym. This preserves
Clueless’s “meaning, not spelling” identity and the bundled-offline boundary.

### Teams and live races **[GIVEN — 2026-08-25]**

One signed-in team layer covers every title. Guests keep solo Play. Teams are
private invite-only (code / `wordkrush://team?code=`). The owner can rename or
disband the crew; a member can leave. The owner cannot leave — they disband.
A live race is 2–10
players on the same numbered path row at once; ranking uses each player's own
score, never a combined team total.

Unlocks are dual: the team's cursor advances if anyone completes the row; a
player's personal cursor advances only if that player completed. During a team
session everyone plays the team's selected level. Completing it is what moves
a personal cursor.

Clueless daily stays solo (UTC). Team Clueless is a timed path on bundled
puzzle numbers, never today's daily. The rival HUD shows guess count and
found/not — never other players' words. Live results do not write
`global_leaderboard`. Reddit is out of scope.

## 7. Architecture

The critical constraint: **game reducers under `src/games/<game-id>/` must
never import React or React Native.** They stay pure TypeScript, testable in
plain Node, and portable if the UI layer ever changes. Cross-game utilities
live directly under `src/games/` instead of creating a second game root.

```
src/
  games/
    more-or-less/       # comparison-game logic
      types.ts
      pairing.ts        # selectNextPair(pool, streak, seen, rng)
      scoring.ts        # streak, lives, best
      engine.ts         # (state, action) => state   -- pure reducer
    clueless/           # Clueless logic
    wordfall/           # Wordfall logic
    rng.ts              # shared seeded RNG
    registry.ts         # shared game metadata
  data/
    categories/*.json   # bundled dataset
    loadCategories.ts   # validates JSON against the schema at startup
  ui/
    screens/
    components/
  native/
    haptics.ts
    gameCenter.ts
```

**The engine as a pure reducer** is the key pattern. `(state, action) => state` with no side effects means an entire run can be replayed in a test in microseconds, and the UI becomes a thin renderer over it.

## 8. Content — the real bottleneck

Building this game is a weekend. Sourcing good data is the actual project.

Each category needs ~50–200 items with a *consistent, defensible* metric. Candidates:

| Category | Metric | Sourcing risk |
|---|---|---|
| Countries | Population | Low — public domain |
| Cities | Population | Low |
| Animals | Top speed / lifespan / weight | Low |
| Movies | Box office gross | Medium — needs attribution |
| Musicians | Monthly listeners | High — API terms |
| Brands / apps | Downloads, valuation | High |
| Foods / general terms | Monthly search volume | High — no clean public API |

**Recommendation for v1:** start with 2–3 **low-risk** categories (countries, animals, cities). They are public-domain, stable, need no API, and prove the mechanic. Add the spicier categories once the game itself is fun.

**[OPEN]** — search volume is the most fun metric and the hardest to license. Do not build v1's content plan around it.

## 9. App Store considerations

Guideline 4.2 (minimum functionality) is the live risk for a simple casual game. Mitigations, all cheap:

- **Offline play** — falls out of bundled data for free.
- **Haptics** — a tap on correct/incorrect. Genuinely improves feel *and* is native integration.
- **Local scores + global leaderboard** — device history is always available; signed-in players also post a per-game best to Supabase (D-025). This is the shipped rank surface.
- **Game Center leaderboard** — still the native 4.2 extra, not a substitute for the local/global tabs. **[PLANNED]**
- **Daily challenge + notification** — later, but the seeded RNG already supports it.
- **Wordfall weekly levels** — owner: new Wordfall levels release each week. **[GIVEN]** Launch curriculum (1–11) stays playable on day one. Later rows set `availableFrom` to that Monday; they ship in the bundle and unlock on the player's local calendar (D-027). Each weekly drop is a **hard unique task** (`taskFingerprint`: puzzle vs race plus objective kinds, not numeric targets) and is **featured for seven days**; the row stays in the catalog after Sunday so unlock numbering has no holes. Not a remote download. Do not invent a sixth objective kind. Agent authoring must test, locally serve the web export, and playtest before GitHub (D-038). Operating spec: [WORDFALL-WEEKLY.md](WORDFALL-WEEKLY.md); loop: `.cursor/skills/wordfall-weekly-gauntlet/`.

## 10. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Data licensing on the fun categories | High | Start with public-domain categories |
| Near-tie pairs feel unfair | High | Ratio guard in the pairing function |
| Data goes stale (bundled, no backend) | Medium | `updatedAt` per item; revisit backend at D-004 |
| Guideline 4.2 rejection | Medium | Native hooks listed in §9 |
| Flat difficulty makes runs boring | Medium | Ratio-band curve, tuned by playtest |

## 11. Data pipeline & correctness model (added 2026-08-16)

The owner chose **Google search volume as the first category** and proposed batch-validating data into Postgres (Supabase) ahead of gameplay. Adopted — with the boundary that the DB is a content *factory*, and the app still ships bundled JSON (STACK D-007).

### "How do we know B is the correct answer?"

You never get absolute truth about popularity; you get a **defensible snapshot**. Correctness is defined as: *item B had a higher value than item A in snapshot S, captured from source X on date D.* The system makes that defensible four ways:

1. **Single source per snapshot, never mixed.** All values in a snapshot come from one source in one batch run. Mixed-source comparisons are meaningless and structurally impossible here.
2. **The fairness guard doubles as correctness insurance.** Pairs within 1.15x are never asked — so measurement noise smaller than the guard *cannot flip the answer of any question a player actually sees*. Big enough gap to ask ⇒ big enough gap to survive noise.
3. **Swing detection.** On re-ingest, any value that moved >10x vs. the previous published snapshot is flagged and quarantined until a human reviews it. Real popularity rarely moves 10x between snapshots; API glitches do.
4. **Provenance in the UI.** The app shows "Source: Google search data, <month year>" — the claim made to the player is exactly the claim the data supports.

### Pipeline shape

```
keywords/*.json ──> ingest.ts ──> [source adapter] ──> sanity checks ──> Supabase
                                   mock | dataforseo | ...               (snapshots + values + flags)
                                                                              │
src/data/categories/*.json  <── export-snapshot.ts  <── latest good snapshot ─┘
        (bundled into the app; the ONLY thing the game reads)
```

Runs in batches, long before any player sees the game — exactly as the owner proposed. The app has zero runtime data dependencies.

### The uncomfortable fact about "a Google API" **[IMPORTANT]**

There is **no official public Google Search-volume API**. Real options, each with a real cost:

| Source | Numbers | Catch |
|---|---|---|
| DataForSEO (or similar licensed reseller) | Absolute monthly volumes | Paid per request; cleanest licensing for use in a product |
| Google Ads Keyword Planner API | Bucketed monthly averages | Requires a Google Ads account + dev token; ToS aimed at advertisers, republishing is gray |
| Google Trends | Relative 0–100 index only | Official API access limited; unofficial scrapers brittle and ToS-gray; cross-batch values need anchor normalization |

Decision is **STACK O-2**, owner's call (it involves money). The adapter interface means choosing late costs nothing. Note: if Trends is chosen, the displayed number becomes a "popularity score" rather than a search count — the game still works, the reveal animation just counts to 87 instead of 3,200,000.

### Tested 2026-08-16: can a web-search-grounded LLM supply the numbers?

The owner asked whether giving the LLM web search solves the sourcing problem. **Tested empirically, not assumed.** Results:

- **Simple prompt, repeated 3x:** returned `13,600,000` for "pizza" every time. Encouragingly stable.
- **Same question, asked to cite its source:** collapsed. Across two runs of five terms, the two runs disagreed **every single time** — one run would refuse ("couldn't locate a reliable source"), the other would produce a number.
- **The damning detail:** that stable 13.6M for "pizza" was attributed to *"RankHero (via Etsy keyword data)"* — an SEO content farm quoting **Etsy marketplace** search data. That is not Google search volume. The stability was the model repeatedly finding the same piece of SEO spam, not the same piece of truth.

**Conclusion:** web search moves the failure from *hallucination* to *garbage-in*. The pages that publish keyword volumes are SEO marketing sites republishing each other's estimates. Grounding doesn't help when the ground is spam. D-010 stands.

### The option worth taking seriously: Wikipedia pageviews **[TESTED, WORKING]**

The Wikimedia REST API returns **measured** monthly pageviews per article. Not an estimate — an actual count, from the organization that owns the servers.

```
GET https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/
    en.wikipedia/all-access/user/{article}/monthly/{start}/{end}
```

| | |
|---|---|
| Cost | **Free** |
| Auth | **None** (just a descriptive User-Agent) |
| Data | **Measured**, not estimated |
| Licensing | Public API, CC-licensed data — clean to use and cite |
| Batch-friendly | Yes — fits the existing offline pipeline exactly |

Verified live: Messi 3,879,233 vs Beyoncé 2,605,936 (Jan–Jul 2025) = 1.49x, comfortably above the fairness guard. The LLM alone called that pair `too_close`; measured data resolves it cleanly. That contrast *is* the argument.

**The honest caveat:** pageviews measure *encyclopedic* interest, not *commercial search* interest. "Pizza" as a Google query is dominated by "pizza near me"; its Wikipedia article sees far less traffic than that implies. So the metric must be **labelled for what it is** — "monthly Wikipedia pageviews", not "Google searches". The game plays identically; the claim on screen just has to match the data behind it. The smoke suite keeps a live example of this divergence (bitcoin vs sushi) as a permanent WARN.

Recommendation: **ship v1 on Wikipedia pageviews** (free, real, honest, unblocks everything today) and treat a paid keyword API as a later upgrade if true Google volumes become worth paying for.

## 12. Next actions

1. ~~Scaffold Expo + TypeScript + Vitest~~ — done 2026-08-16, with EAS profiles, CI, and the content pipeline (mock source).
2. Owner: complete the one-time setup checklist in [WORKFLOW.md](WORKFLOW.md) (Expo login, Apple Developer, apply Supabase migration, pick data source O-2, pick web host O-6).
3. **Confirm the [OPEN] items** — especially the MORE/LESS framing and carry-over mechanic.
4. Build the rest of `src/games/more-or-less/` (engine reducer, pair selection with seeded RNG, scoring) with tests.
5. Run `pipeline:ingest` + `pipeline:export` against Supabase with the mock source to prove the chain; swap in the real source when O-2 is decided.
6. Wire the minimal UI; playtest and tune the difficulty bands.

---

## Correction log

Append here whenever an assumption is confirmed or overturned. Never delete an entry — the trail is the point.

| Date | Item | Change |
|---|---|---|
| 2026-08-16 | — | Document created. Reference site could not be read (SPA returned no content, search declined); all mechanics are **[ASSUMED]** from genre convention pending owner confirmation. |
| 2026-08-16 | §8 first category | **Owner overrode the low-risk recommendation**: first category is Google search volume, not countries/animals. §8's licensing warning stands and became STACK O-2; mitigated by the source-adapter design (§11) so plumbing isn't blocked on the choice. |
| 2026-08-16 | §7 architecture | Implemented as designed: `src/game/` is pure TS with tests; pipeline added under `pipeline/` with Supabase as content factory (STACK D-007/D-008). |
| 2026-08-22 | §7 architecture | The owner consolidated game code under one root: each title uses `src/games/<game-id>/`. More or Less moved from `src/game/` to `src/games/more-or-less/`; shared RNG and registry modules remain directly under `src/games/`. |
| 2026-08-22 | Wordfall cadence | Owner: Wordfall gets a new level each week. Implemented as bundled rows with a Monday `availableFrom`, not a live content server. |
| 2026-08-22 | Wordfall weekly uniqueness + TTL | Weekly drop is a unique hard task vs the catalog (especially last week). Featured window is seven days; expired rows stay playable so campaign unlocks do not hole. Agent must locally test and `serve:web` before GitHub. |
| 2026-08-25 | Solo More or Less pool | Owner: the Wikipedia labels are a gated round queue, not one eternal 50. The player stays on the current set until every name has been seen; new sets are sampled weekly from a pipeline-only reservoir. Calendar does not advance the player. Reddit keeps the newest published round so a post stays shared. |
| 2026-08-25 | Teams / live race size | Owner raised a live race from 2–4 to 2–10 simultaneous players. Team invite, CRUD, and dual unlock are unchanged. |
| 2026-08-25 | Wordfall Stretch level | Owner changed level 2 to count four-letter words and longer. The goal now teaches longer-word scoring; special creation remains governed by the existing trigger rules. |
