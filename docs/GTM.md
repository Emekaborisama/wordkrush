# Go-To-Market Strategy

**Last updated:** 2026-08-22
**Status:** Strategy. Marked **[DECIDE]** where the owner's call is needed.
**Related:** [BRAINSTORM.md](BRAINSTORM.md) (what the games are) · [ROADMAP.md](ROADMAP.md) (what is being built) · [OBSERVABILITY.md](OBSERVABILITY.md) (how we measure) · [branding/](branding/) (name, voice, logo) · [security-and-anti-cheat/](security-and-anti-cheat/) (why the leaderboard is a launch gate)

No claim here is a market statistic. Everything is reasoned from what is in the
repo and from how the genre's growth mechanics work. Where a number would
matter, this document says which instrument should produce it.

---

## 1. The diagnosis

**WordKrush has a content engine and no distribution loop.**

The hard half of a daily-games business is already built, and built well:

- **Three games with three different natural cadences** — Clueless is daily,
  Wordfall drops Mondays (D-027), More or Less is play-anytime. That is a
  retention portfolio, not a pile of games.
- **A cross-game daily streak** (`src/streak/`) that makes the hub, not any
  single title, the thing a player returns to.
- **Two automated content pipelines that already run weekly** — the Wikipedia
  popularity refresh (D-036) and the Wordfall Gauntlet drop (D-038). Fresh
  content arrives every week without anyone deciding to make it. Most small
  studios never get here.
- **A brand, a design system, and a live web build** on a real domain (D-020,
  D-028, D-031).

And then nothing that turns a played session into a new player:

| Missing | Evidence | Consequence |
|---|---|---|
| **Any share mechanic** | No `Share`, `Clipboard`, or share-sheet code anywhere in `App.tsx` or `src/ui/`. ROADMAP lists "replay/share" as unbuilt. | A finished daily puzzle produces nothing a player can send to anyone. The genre's primary growth channel is absent. |
| **Link previews** | `scripts/patch-web-head.mjs` sets favicons only. No `og:` or `twitter:` tags. | Every wordkrush.com link posted anywhere renders as a blank grey card. |
| **A page that is not the app** | Single ~3 MB JS bundle, no server-rendered HTML (D-006, which names the weak-SEO cost explicitly) | Nothing to rank, nothing to link to, nothing to read before installing. |
| **iOS** | Blocked on the $99 Apple Developer Program (ROADMAP) | An entire distribution channel is closed for less than the price of a dinner. |

The strategic consequence is sharp: **every hour of marketing spent before
those exist leaks.** Attention arrives, plays, enjoys itself, and terminates.
Acquisition without a loop is a bucket with no bottom, and the bottom is four
concrete engineering tasks — not a campaign, not a budget.

**So the first phase of GTM is engineering, not marketing.** Everything in §6
assumes §5 is done.

**One exception, added 2026-08-23.** The Reddit app (D-042, §6 Tier 1) does not
wait for §5, because none of the four rows above apply to a game that runs
*inside* a Reddit post. It is the only channel in this document that closes the
loop without first building one.

---

## 2. Positioning

> **WordKrush is a five-minute daily brain workout — three different games,
> one streak.**

The category is the daily-puzzle habit that Wordle established: short, free,
no install required, a shared clock, and a result worth showing someone. The
category's convention is **one game, one mechanic, one daily grid.**

WordKrush's differentiator is structural, not cosmetic: **three distinct
cognitive modes under a single streak.**

| Game | Mode | Cadence | GTM job |
|---|---|---|---|
| **Clueless** | Semantic reasoning — follow meaning, not spelling | Daily | **The front door.** Shareable, has a daily clock, is the format people already understand. |
| **More or Less** | Numeric intuition and calibration | Anytime, endless | **The session extender.** No clock, so it absorbs the "one more" impulse after the daily is done. |
| **Wordfall** | Spatial word-finding | Weekly | **The event.** A Monday reason to come back and a thing to talk about. |

The one-streak framing is what makes that a product rather than an arcade. A
player who misses Clueless can save the streak with Wordfall — three chances a
day to keep a habit alive is materially stickier than one, and it is the honest
reason to build a hub instead of shipping three apps.

The stated purpose — *cognitive skills and pattern recognition through repeated
play* (D-023, D-028) — is real positioning for an older and parent-adjacent
audience, but it is **store and site copy, not UI copy**. In the app, the
promise stays the one in the brand kit: *guess correctly, keep the streak
alive, beat your best*. Nobody opens a game to improve themselves; they open it
because yesterday's streak is at risk.

**[DECIDE]** — is the public pitch "daily brain workout" (broad, wellness-
adjacent, competes on habit) or "three puzzle games in one" (narrow, competes
on variety)? Recommendation: **daily brain workout**, because it names the
habit the streak is built to create and gives the SEO and store copy something
to be about.

---

## 3. Who we are actually for

Not "casual gamers" — that is a demographic, not a wedge.

**Primary: the lapsed or over-served daily-puzzle player.** Already does a word
game with coffee. Has the habit; the habit is under-served because their game
is one mechanic and finishes in ninety seconds. The pitch is not "better than
your puzzle" — it is *"and then what?"* This is the entire beachhead: they need
no education about the format, no install, and no argument for why a daily
puzzle is worth doing.

**Secondary: the streak keeper.** Motivated by the counter itself more than any
one game. Three games and one streak is built precisely for them, and they are
disproportionately likely to be the ones who share.

**Tertiary: the parent or teacher** looking for a screen activity that is not
extractive. Reached by the purpose framing, no ads, and offline play. Slower to
convert, much slower to churn, and the audience for whom the display-name
moderation gap in [SEC-06](security-and-anti-cheat/THREAT-MODEL.md#sec-06--public-display-names-are-unmoderated--medium)
is a genuine blocker, not a nice-to-have.

**Explicitly not for:** mid-core mobile gamers, competitive esports, anyone
expecting progression systems or monetised depth. The whole product is five
minutes long by design and should not apologise for it.

---

## 4. The growth loop

One loop, and every item in §5 exists to close a specific arc of it:

```
        ┌──────────────────────────────────────────────────┐
        │                                                  │
        ▼                                                  │
   PLAYS the daily ──► GETS a result worth showing ──► SHARES it
        ▲                    (spoiler-free grid)           │
        │                                                  ▼
   RETURNS tomorrow ◄── STREAK at risk ◄── PLAYS ◄── friend CLICKS
        │                                          (rich preview,
        │                                         instant web play)
        └── weekly Wordfall drop pulls them back ──┘
```

Three properties make this loop work, and all three are cheap:

1. **The artifact is spoiler-free.** Wordle's emoji grid is the whole design
   lesson: it conveys *the shape of your performance* without leaking the
   answer, so sharing it is socially safe and competitively interesting at
   once. Clueless's ranked-guess trail already has this shape — a heat trail of
   how cold you started and how fast you closed. Wordfall has cascade chains.
   More or Less has a streak length. All three are gridable.
2. **The link lands on a playable thing in one tap.** Web, no install, no
   account (D-016 keeps accounts optional). This is the single biggest
   advantage the web build has over the App Store, and it is currently wasted
   on a blank preview card.
3. **The return trigger is already built.** The daily streak plus a Monday drop
   is a two-rhythm retention system that needs no push notifications and no new
   content decisions.

**The loop is not live.** Arc 2 (share) does not exist and arc 3 (click) has no
preview. §5 closes both.

---

## 5. Phase 1 — Close the loop (engineering, ~2–3 weeks)

Nothing in §6 should start before these ship. Ordered by leverage per hour.

### 5.1 The share card · **highest leverage in this document**

A spoiler-free result grid per game, copied to clipboard and offered to the
native share sheet, on every game-over screen.

- Clueless: the heat trail of guess ranks — cold to warm to solved.
- Wordfall: level, score, and the cascade chain shape.
- More or Less: streak length and where it broke.

Include the puzzle number, the streak, and the bare URL. Never the answer.

Constraint: this belongs in the UI layer only. Pure reducers under
`src/games/<id>/` stay untouched (agents.md), and the grid is derived from
state the engines already expose — `guesses`, `lastPlay`, `played`.

**Without this, the product has no organic growth mechanism at all.** It is one
component and three small formatters.

### 5.2 Open Graph and Twitter card tags

`scripts/patch-web-head.mjs` rewrites `dist/index.html` at build time: favicons
plus `og:title`, `og:description`, `og:image`, `twitter:card`, and a canonical
URL. The image is [`marketing/reddits/assets/og-share.png`](marketing/reddits/assets/og-share.png)
(1200×630), served as `https://wordkrush.com/og.png`. Until that build is live
and the URL is re-scraped, old shares can still show a grey rectangle.

### 5.3 A real landing surface

D-006 chose one Expo codebase and explicitly named the cost: *"weaker SEO than
a purpose-built web app — acceptable for a game behind a Play button. Split
into a monorepo only if web becomes a marketing/SEO surface."* GTM is the
condition that decision anticipated. It is now time to revisit it.

Two options, and the cheap one is genuinely good enough to start:

- **Static pre-rendered pages** served alongside the bundle by
  `server/serve.mjs` — a real `/` with copy, screenshots, and a Play button;
  `/how-to-play/<game>`; an about page. Days of work, no architecture change.
- **The monorepo split** D-006 describes (shared logic package + Next.js).
  Weeks. Only justified once 5.4 proves search traffic converts.

**Recommendation: static pages now, revisit the split after 5.4 has data.**

### 5.4 Programmatic SEO from the pageview data · *the unfair advantage*

This is the asset nobody else in the genre has. The Wikipedia popularity
pipeline produces **measured monthly pageview medians** for a curated entity
list, refreshed weekly by an existing cron (D-012, D-013, D-036).

"Is X more popular than Y" is a real, high-intent search shape, and the site
can answer it with measured data, correct provenance, and a playable game about
exactly that question sitting right there on the page.

- Generate a page per interesting pair from the same snapshot the game plays on.
- Provenance on every page: *"monthly Wikipedia pageviews, median of 6 complete
  months, as of <month>"*. D-012's honesty rule is a **trust asset** here —
  never let a page imply Google search volume; a test already enforces that
  no category claims "Google".
- Every page ends in the game.

Content generation is nearly free because the data is already produced,
validated, and refreshed on a schedule. This compounds weekly while the team
sleeps, which is the only kind of channel worth building early.

### 5.5 Buy the Apple Developer Program

$99. It blocks TestFlight, App Store submission, and an entire acquisition
channel. It is the highest return-per-dollar line item in the whole plan and it
has been sitting in ROADMAP's blocked list.

### 5.6 Make the leaderboard honest before pointing traffic at it

`docs/security-and-anti-cheat/` documents that the global board currently ranks
whatever number a client asserts, with no verification
([SEC-01](security-and-anti-cheat/THREAT-MODEL.md#sec-01--the-global-leaderboard-accepts-any-number-a-client-sends--critical)).

This is a GTM item, not just a security one. Driving acquisition at a
competitive board that can be topped with one `curl` converts marketing into a
trust problem — and the players most likely to notice are the competitive ones
who would otherwise be the best retained cohort. The *Now* and *Next* phases in
[ANTI-CHEAT.md](security-and-anti-cheat/ANTI-CHEAT.md#sequencing) are hours and
days respectively.

Same argument for display-name moderation
([SEC-06](security-and-anti-cheat/THREAT-MODEL.md#sec-06--public-display-names-are-unmoderated--medium)):
a public board is a publishing surface, and traffic is what summons the first
offensive name.

---

## 6. Phase 2 — Channels

Ranked by fit. Resist the temptation to reorder toward the ones that feel like
marketing.

### Tier 1 — Build these

**Organic sharing (§5.1 + §5.2).** The genre's proven engine. Compounding,
free, and entirely gated on two weeks of engineering. Everything else in this
list is a supplement to it.

**Programmatic SEO (§5.4).** Compounding, defensible, powered by a cron that
already runs. Slow to start — assume months, not weeks, before search traffic
is material — which is exactly why it should start now.

**Communities, done honestly.** Puzzle and word-game subreddits, Discords,
daily-puzzle aggregator sites, the "games like Wordle" list posts. The rule is
participation before promotion: a link dropped by a stranger is spam, the same
link from someone who has been posting their results for a month is a
recommendation. This is the one channel that works *before* §5 is finished,
because a person can carry the context a missing preview card cannot.

**Reddit as a surface, not a subreddit (D-042).** [BUILT — blocked on app review]
This is the one channel that does not wait for §5, because it does not need any
of it. [`reddit/`](../reddit/README.md) runs More or Less *inside a Reddit post*
via Devvit. Look at what that does to §1's table:

| §1 blocker | On Devvit |
|---|---|
| No share mechanic | The post **is** the share. Playing produces a comment; comments rank the post; ranking brings players. |
| Blank link previews | Nothing links out. |
| No SEO surface | Reddit threads rank on their own. |
| iOS blocked on the $99 fee | It runs in the Reddit app on every phone. |

Four blockers made irrelevant rather than solved, and the loop closes without a
share card, an OG tag, or an Apple account.

**More or Less, not Clueless**, and the reason is easy to miss: a daily word
puzzle has a spoiler problem — the comments fill with the answer and poison the
post for everyone who scrolls past later. More or Less has no single answer to
spoil, is one tap with no learning curve, produces disagreements people want to
argue about, and its content is already refreshed weekly by an existing cron
(D-036) with no work from anyone.

**What it costs, stated plainly.** A second surface to maintain that will drift
from the hub. No email, no install, no direct relationship — **Reddit owns the
audience and can change the terms.** Supabase auth, the global board and the
cross-game streak do not come along. Treat it as a distribution experiment with
its own ceiling, not as the product's new home.

**What it pays.** Reddit Developer Funds is a one-time $500 at 500 daily
qualified engagers and roughly $4,000 at 5,000. Modest — but §6 Tier 3 rules out
ads and IAP and O-5 is still open, so it is the only revenue on the table that
does not contradict a documented decision.

**The rule that decides whether this works:** participation before promotion.
Read each subreddit's rules, talk to its moderators before installing anything,
and do not run the same post in five communities — that is the "no substantially
similar content across multiple subreddits" line in Reddit's Responsible Builder
Policy, and it is also just how this fails.

### Tier 2 — Once the loop is live

**App Store (post-5.5).** Search traffic for "word games", "daily puzzle",
"brain training" is real and free. The differentiator — three games, one
streak — is a legible store listing, and offline play is a genuine listing
feature. Requires: screenshots (ROADMAP: outstanding), a privacy policy
([PLATFORM-SECURITY §6](security-and-anti-cheat/PLATFORM-SECURITY.md#6-privacy)),
and the Guideline 4.2 "not too thin" case that the haptics and Game Center
items in ROADMAP were always meant to make.

**Weekly drop as an event.** Wordfall's Monday drop is a recurring reason to
post — "this week's Gauntlet" — and D-038 already guarantees each one is a
genuinely different task via `taskFingerprint`. A content calendar that
generates itself is rare; use it.

**Creators, small and matched.** Puzzle streamers and word-game YouTubers with
small, engaged audiences. A daily game is good on camera because it is short
and the failure states are funny. Send the game, not a brief.

### Tier 3 — Later, or never

**Paid acquisition.** Only after retention is measured and the loop is closed.
Paying to fill a leaking bucket is the classic way to spend a budget learning
what §1 already says for free. With no monetisation decided (O-5 open), there
is not even a payback model to compute against — so paid cannot be evaluated,
let alone justified.

**Press.** A three-game puzzle hub from an unknown studio is not a story. It
might become one after a milestone worth reporting.

**Cross-promotion partnerships.** Needs an audience to trade. Revisit later.

---

## 7. Measurement

### North star

**Weekly returning players who kept a streak.** Not installs, not DAU — the
metric that says the habit formed, which is the only thing that makes any
channel above pay back.

### The funnel, and which event answers it

The instrumentation in `src/analytics/events.ts` is unusually well designed for
this — most of the funnel is already covered:

| Question | Event | Status |
|---|---|---|
| Did they get to a game? | `game_selected`, `run_started` | **[BUILT]** |
| Did they finish one? | `run_completed` | **[BUILT]** |
| Did they play a second? | `run_started` (count per session) | **[BUILT]** |
| Did they come back tomorrow? | `app_opened` + streak state | **[BUILT]** |
| Did they share? | — | **Missing. Add `result_shared` with §5.1.** |
| Did a share bring anyone? | `landing_viewed` / `app_opened.entry_source` | **[BUILT]** — bounded `share` / `paid` / `search` / `social` / `direct`. Still needs `utm_medium=share` on the share URL. |

One addition still required before a share-channel claim can be evaluated: a
`result_shared` event (game, surface, streak bucket). Bounded `entry_source`
on `app_opened` / `landing_viewed` is built — it distinguishes shared link,
paid, search, social, and direct **without** sending URLs, in keeping with
D-022. Share links still need `utm_medium=share` to land in that bucket.

### The consent problem — read this before trusting any number

Analytics is **opt-in and disabled until the player explicitly consents**
(D-022). That is the right call and it is not up for renegotiation here. But it
means product analytics measures **consenting players only**, and consenting
players are not a random sample — they skew engaged.

Planning acquisition off that data will systematically overstate retention and
understate top-of-funnel loss.

The fix is not weakening consent. It is knowing which instrument answers which
question:

| Question | Instrument | Consent needed |
|---|---|---|
| How many people reached the site? | Railway request logs, aggregate | No |
| How many played at all? | Consented `run_started`, treated as a **lower bound** | Yes |
| How many accounts exist? | Supabase `players` count | No |
| How many rank on a board? | `global_scores` distinct players | No |
| Retention, funnels, balance | PostHog, on the consenting cohort | Yes |

State the bias in every report rather than discovering it during a budget
conversation. **[DECIDE]** — is a privacy-preserving aggregate page-view count
(no cookies, no per-user identifiers) acceptable as an unconsented top-of-funnel
measure? It sits inside D-022's spirit but the decision is the owner's.


---

## 8. What not to do

- **Do not market before §5.** The loop is the product's growth mechanism.
  Traffic arriving before it lands is spent, not invested.
- **Do not launch three games as three products.** The hub and the shared
  streak are the differentiator. Three thin apps compete with everything;
  one habit with three modes competes with very little.
- **Do not claim Google search volume.** D-012 settled this and a test enforces
  it. The metric is monthly Wikipedia pageviews. The honesty is a trust asset
  in exactly the SEO context where the temptation to fudge is highest.
- **Do not add ads or IAP to chase early revenue.** O-5 is open and out of
  scope for v1. Monetisation before retention converts a habit product into a
  churn product, and the parent/teacher segment is the first to leave.
- **Do not promote the leaderboard until it is verifiable.** §5.6.
- **Do not weaken the consent model to improve dashboards.** §7 has the
  workaround. D-022 is a positioning asset for the tertiary audience, not
  merely a constraint.

---

## 9. Sequence

| Phase | Weeks | Work | Exit condition |
|---|---|---|---|
| **0 — Close the loop** | 1–3 | Share cards, OG tags, static landing, leaderboard *Now* + *Next*, buy the Apple program | A player can share a result and the link renders and plays |
| **1 — Beachhead** | 3–6 | Community participation, first SEO pages, weekly drop as an event | Organic shares producing measurable new sessions |
| **2 — Channels** | 6–12 | TestFlight → App Store, SEO scale-up, creator seeding | Web + iOS both acquiring; retention measured |
| **3 — Scale** | 12+ | Evaluate paid against real retention, revisit O-5 monetisation | Payback model exists before a budget does |

---

## 10. Open decisions

Per WORKFLOW these are the owner's calls. No one should code past them.

- **[DECIDE] The public pitch** — "daily brain workout" or "three puzzle games
  in one"? (§2, recommendation: the former.)
- **[DECIDE] Revisit D-006** — do static pre-rendered pages suffice, or does
  web become a first-class marketing surface warranting the monorepo split?
  (§5.3, recommendation: static now, decide after data.)
- **[DECIDE] Buy the Apple Developer Program** — $99, blocking an entire
  channel. (§5.5.)
- **[DECIDE] The launch subreddit for the Reddit app** — which community, and
  has its moderator been asked? The app is built and blocked only on this plus
  `devvit login` and app review. Installing into a community that was not
  consulted is the fastest way to lose the channel. (§6 Tier 1, D-042,
  [reddit/README.md](../reddit/README.md).)
- **[DECIDE] O-5 monetisation** — still out of scope for v1, but Phase 3 needs
  a payback model before paid acquisition can be evaluated at all. Reddit
  Developer Funds (D-042) is the first revenue that does not require ads or IAP;
  accepting it is a decision, not a default.
- **[DECIDE] Unconsented aggregate top-of-funnel counting** — acceptable within
  D-022, or not? (§7.)
