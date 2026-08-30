# Growth Blockers

**Last updated:** 2026-08-30
**Status:** Audit of commit `5ca2a6b`. Every gap below was verified in the code, not assumed.
**Read first:** [README.md](README.md), then [GTM-STRATEGY.md](GTM-STRATEGY.md).

This is the Phase 0 work list. These are **product** gaps that cap growth, not
marketing tasks — no amount of promotion routes around them. They are ranked by
leverage, and the ranking is the recommended build order.

None of this is speculative polish. Each item is a place where an interested
player currently fails to become two players.

---

## 0. The content clock — Clueless wraps 2026-09-16

**Severity: gating. Nothing else ships until this is scheduled.**

`src/data/clueless/index.ts`:

```ts
export function todaysPuzzleNumber(date = new Date()): number {
  const epoch = Date.UTC(2026, 7, 17); // 2026-08-17, puzzle #1
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const days = Math.floor((today - epoch) / 86_400_000);
  return (((days % PUZZLES.length) + PUZZLES.length) % PUZZLES.length) + 1;
}
```

`PUZZLES.length` is 30. The modulo means the pool **wraps silently** — on
2026-09-16 every player who has been there since launch gets puzzle #1 again,
with their guesses already in local history. The code comment is honest that
this is a deliberate placeholder ("Replacing this with a real daily schedule is
a content decision, not a code one").

| | |
|---|---|
| Fresh dailies remaining | **24** (today is #6; #30 falls on 2026-09-15) |
| Wrap date | **2026-09-16** |
| Needed for a 90-day runway | ~60 more puzzles |

**Work:** run the generator (`cd validator && uv run python -m app.clueless.build`)
to produce puzzles 31–120, then human-review the answers for the brand-safety
question raised in [README.md](README.md#open-questions-for-the-owner). The
generator exists and is documented in `src/data/clueless/index.ts`; this is a
content-operations task, not new engineering.

**Also worth fixing while in here:** the wrap should not be silent. If the pool
does run out, the game should say so rather than quietly replaying. That is a
small change and it converts a trust-breaking bug into an honest message.

**Effort:** generator run is hours; human review of ~90 answers is the real cost.

---

## 1. No share loop

**Severity: highest leverage. This is the acquisition channel, and it does not exist.**

Verified absent:

- `src/analytics/events.ts` — `game_over_action.action` is
  `'play_again' | 'scores' | 'home'`. No share.
- `src/ui/screens/GameOverScreen.tsx` — no share control, no clipboard call.
- Nothing anywhere in `src/` calls a share or clipboard API.

For daily word games the spoiler-free result share is not *a* growth tactic, it
is *the* growth model — it is how Wordle went from 90 players to millions
without spending anything. The share is self-targeting (it lands in group chats
of people who already like word games), it carries zero CAC, and it is the only
channel that compounds per-cohort rather than per-dollar.

### The format matters more than the button

A share is only pasted if the artifact is interesting and safe to post. Two
rules: **never spoil the answer**, and **make the shape tell the story**.

The good news is the codebase already has the exact primitive needed.
`rankBucket()` in `src/analytics/events.ts` returns
`'win' | 'top_10' | 'top_100' | 'cold' | 'unranked'` — which maps directly to a
spoiler-free emoji grid of the guess journey:

```
WordKrush · Clueless #23
Found it in 14

⬛⬛🟥⬛🟥🟧
🟧🟨🟧🟨🟩

wordkrush.com
```

`⬛ unranked · 🟥 cold · 🟧 top 100 · 🟨 top 10 · 🟩 got it`

**The strategically important one is the cross-game streak share**, because it
puts the positioning from [GTM-STRATEGY.md](GTM-STRATEGY.md#1-what-we-are-actually-selling)
inside the artifact that travels:

```
WordKrush · Day 12 🔥
Clueless #23 — 14 guesses
Wordfall L7 — 2,340

wordkrush.com
```

Someone reading that learns there are multiple games and a streak, from a
message their friend chose to send. That is the whole pitch delivered by a
trusted source, for free. A single-game share cannot say that.

**Implementation notes:** React Native ships a `Share` API and the web has
`navigator.share` with a `navigator.clipboard` fallback — no new dependency
needed, which matters under the house convention in `agents.md`. Keep the
formatting function **pure and tested** in `src/games/<id>/` alongside the other
reducers; it takes a result and returns a string, and it should never import
React. Add `'share'` to `game_over_action.action` and a `share_completed` event
so the rate is measurable from day one — see [METRICS.md](METRICS.md).

**Effort:** small. A pure formatter, a button, one analytics event. This is
probably a day of work for the largest single growth lever in the product.

---

## 2. No link preview

**Severity: high. It silently wastes every share that does happen.**

`scripts/patch-web-head.mjs` copies
[`reddits/assets/og-share.png`](reddits/assets/og-share.png) (1200×630) to
`dist/og.png` and injects `og:title`, `og:description`, `og:image` as an
absolute `https://wordkrush.com/og.png` URL, plus `og:url`, `og:site_name`,
and the `twitter:*` equivalents. Scrapers do not resolve relative image paths.

Until that build is on wordkrush.com and the URL is re-scraped, pasted links
can still show the old blank card — Facebook and Reddit cache previews
aggressively.

**Effort:** shipped in the export script. Remaining work is deploy + rescrape.

---

## 3. No search surface

**Severity: high, and it is the only channel that keeps paying after you stop working.**

`app.json` still sets `web.output: "single"`, so wordkrush.com is a
client-rendered SPA. **[BUILT 2026-08-30 — ST-92 / D-061]** The homepage is no
longer a JS-only shell: `scripts/patch-web-head.mjs` writes a game-named title,
canonical, description, WebSite/WebApplication JSON-LD, hub copy in `#root` and
`<noscript>`, `robots.txt`, and a one-URL `sitemap.xml`. `server/serve.mjs`
serves `.xml` as `application/xml`. The playable hub still mounts at `/`.

That opens branded search (`wordkrush.com`, `wordkrush`). **"wordle
alternative", "games like semantle", "daily word games"** still need real
per-game HTML — those queries remain unreachable until item 3 ships.

This is the difference between a launch that decays and one that compounds.
Listicle and community traffic spikes and fades within days; search traffic
arrives every day for years and costs nothing per visit.

**Work:**

1. **[BUILT]** Crawlable homepage copy at `/` — the three games, the streak
   line, and the hub taglines from `src/games/registry.ts`, injected into the
   Expo `index.html` rather than a separate marketing page.
2. **[BUILT]** `robots.txt` and `sitemap.xml`, emitted into `dist/` by
   `scripts/patch-web-head.mjs`. The Search Console HTML file is served at
   `/googled8072618779c67b2.html`. After deploy, confirm verification, submit
   the sitemap, and request indexing (see `docs/HOW-IT-WORKS.md`).
3. **A page per game** (`/clueless`, `/wordfall`, `/more-or-less`) with a real
   description and how-to-play text. These are the pages that rank for
   "games like semantle", and `src/ui/HowToPlay.tsx` already has the copy.

**Do not** convert the whole app to static rendering for this. The games are
client-side by design and should stay that way; this is about giving crawlers a
few real HTML documents that link into the app.

---

## 4. Attribution is structurally limited

**Severity: medium. Not a blocker, but it shapes what Phase 1 can conclude.**

Per `../STACK.md` D-040, PostHog starts **opted out**. Guests stay anonymous;
consented sign-up creates a person profile. Session replay and autocapture stay
off. This is still a privacy-limited setup and this document is **not**
recommending session replay or unsigned-in identification.

But it means totals are still incomplete: only consenting players appear at
all, so every number is a floor, not a count. Guest play cannot be followed
across devices.

**Work:** none in the product. The response is a measurement plan that leans on
server-side truth (Railway request logs, Supabase leaderboard rows, unique
usernames from migration `0004`) rather than client analytics. That plan is
[METRICS.md](METRICS.md). The point of listing it here is that **someone will
otherwise conclude "growth isn't working" from a dashboard that was never built
to show it.**

---

## 5. Thin content in the other two games

**Severity: medium. It caps how long the habit survives, not whether it starts.**

| Game | Current | Concern |
|---|---|---|
| More or Less | **50 items, one category** (`wikipedia-popularity.json`) | One category is one mode. With carry-over chaining 50 items stretch further than they look, but a returning player sees repeats fast. `docs/BRAINSTORM.md` §8 already lists low-risk candidates (countries, animals, cities) that need no new licensing. |
| Wordfall | **11 levels**, one Monday drop each | ~11 weeks of runway, and the ST-78 weekly gauntlet agent is being built to extend it. Lower risk than Clueless because the cadence is weekly, not daily. |

Neither gates Phase 1. Both gate Phase 2 — retention over months is a content
question, and a hub whose games all feel exhausted is worse than one good game.

---

## Build order

| # | Item | Effort | Blocks |
|---|---|---|---|
| 0 | Clueless content to 90+ days | Content review | **All promotion** (G-002) |
| 1 | Share loop + share formatter + events | ~1 day | The primary growth channel |
| 2 | Open Graph tags (re-apply) | ~30 min | Every share and listicle link |
| 3 | Per-game ranking pages (`/clueless`, `/wordfall`, `/more-or-less`) | 1 day | Alternatives-intent SEO (homepage + robots + sitemap: **built**) |
| 4 | — measurement plan, no code — | — | Interpreting Phase 1 |
| 5 | More categories / more Wordfall levels | Ongoing | Phase 2 retention |

Items 1–3 are roughly **two to three days of engineering**. Item 0 is the long
pole and it is content review, not code. That is the full cost of the two-week
delay recommended in G-001, and it converts a one-time launch spike into a
compounding channel.
