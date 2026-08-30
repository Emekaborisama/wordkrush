# Growth Blockers

**Last updated:** 2026-08-22
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

## 1. Share loop — shipped (0.8.19); cross-game streak share still open

**Severity: was highest leverage. Per-game share is live; the cross-game streak card is not.**

Shipped:

- Pure formatters in `src/games/<id>/share.ts` plus `src/games/share.ts` for the
  URL (`utm_source=player&utm_medium=share`) and row wrap.
- Platform twin `src/native/share.ts` / `share.native.ts` — RN `Share` on
  native, `navigator.share` then clipboard on web. TeamsScreen already used
  `Share.share` for invites; result share reuses that API, not a new dependency.
- Share control on More or Less game over, Clueless solve, and Wordfall win or
  loss. A dismissed sheet is silent; a clipboard write shows “Copied to clipboard”.
- `game_over_action.action` includes `'share'`. `result_shared` fires only when
  the text actually left the app (`method: share_sheet | clipboard`).

Still open: the **cross-game daily streak** paste. A single-game grid cannot say
“three games, one habit.” That card is a follow-up, not a blocker for the button.

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

Clueless v1 is a sorted heat *spread* (guesses are re-ordered by rank before
the win card), not a chronological journey. Adding an `order` field for a
true trail is a follow-up that touches the reducer and stored saves.

**Effort remaining:** the cross-game streak card, not another per-game button.

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

`app.json` sets `web.output: "single"`, so wordkrush.com is a client-rendered
SPA. The complete text a crawler receives today:

> `You need to enable JavaScript to run this app.`

There is no `robots.txt`, no `sitemap.xml`, and no meta description. Google
cannot rank a page whose content it cannot see, so **"wordle alternative",
"games like semantle", "daily word games" — the highest-intent, highest-volume
queries in this category — are structurally unreachable.**

This is the difference between a launch that decays and one that compounds.
Listicle and community traffic spikes and fades within days; search traffic
arrives every day for years and costs nothing per visit.

**Work — the minimum that opens the channel:**

1. **A real static landing page** at `/` or `/about` with crawlable HTML: what
   the three games are, how the streak works, and the positioning line. This can
   be a hand-written static file served by `server/serve.mjs` before the SPA
   takes over — it does not require converting the app to static rendering.
2. **`robots.txt` and `sitemap.xml`**, emitted into `dist/` by the same
   `scripts/patch-web-head.mjs` step that handles icons and OG tags.
3. **A page per game** (`/clueless`, `/wordfall`, `/more-or-less`) with a real
   description and how-to-play text. These are the pages that rank for
   "games like semantle", and `src/ui/HowToPlay.tsx` already has the copy.

**Do not** convert the whole app to static rendering for this. The games are
client-side by design and should stay that way; this is about giving crawlers a
few real HTML documents that link into the app.

**Effort:** a day or two, mostly copywriting. `server/serve.mjs` already serves
arbitrary files from `dist/` with correct MIME types and caching, so the
plumbing is done.

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
| 3 | Landing page, robots.txt, sitemap, per-game pages | 1–2 days | The durable channel |
| 4 | — measurement plan, no code — | — | Interpreting Phase 1 |
| 5 | More categories / more Wordfall levels | Ongoing | Phase 2 retention |

Items 1–3 are roughly **two to three days of engineering**. Item 0 is the long
pole and it is content review, not code. That is the full cost of the two-week
delay recommended in G-001, and it converts a one-time launch spike into a
compounding channel.
