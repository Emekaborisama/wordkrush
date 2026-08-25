# Channels

**Last updated:** 2026-08-22
**Status:** Draft. Nothing executed — no post has been made, no list has been contacted.
**Read first:** [GTM-STRATEGY.md](GTM-STRATEGY.md). Channels are Phase 1+; none of this runs until Phase 0 closes.

Ranked by expected value per hour of effort, for *this* product — a free web
word game with no budget, no audience, and no monetization. The ranking would be
different for almost any other product, and the reasoning is included so it can
be re-derived when the situation changes.

---

## The short version

| Channel | Effort | Value | When |
|---|---|---|---|
| Player result sharing | Build once (~1 day) | **Highest** | Phase 0 build, compounds forever |
| **The game as a Reddit app (Devvit)** | **Built** | **High — and it needs no Phase 0** | **Now, once a subreddit says yes** |
| Existing "Wordle alternatives" listicles | Low, per-outreach | **High** | Phase 1 |
| Reddit + puzzle communities | Medium, ongoing | **High** | Phase 1 |
| SEO on alternatives intent | 1–2 days, then slow | **High, durable** | Phase 0 build, Phase 2 payoff |
| Weekly Wordfall drop as a hook | Already built | Medium | Phase 2, recurring |
| Discord / group-chat seeding | Low | Medium | Phase 1 |
| Product Hunt / HN | One shot | Low–Medium | Phase 2, once only |
| Short-form video | High | **[OPEN]** | Not before Phase 2 |
| Paid acquisition | Money | **Negative** | Not in 2026 (G-004) |

---

## 1. Player result sharing — the actual channel

Everything else on this list is a way to seed players *into* this loop. It is
covered in [GROWTH-BLOCKERS.md](GROWTH-BLOCKERS.md#1-no-share-loop) because it
is a product build, not a marketing activity, but it belongs at the top here so
the ranking is honest.

Why it dominates: a share lands in a group chat from a trusted friend, it is
free, it targets itself (people share word games with people who like word
games), and it scales with the player base instead of with effort. No campaign
on this list has those properties.

**The one thing to get right:** share the *streak*, not just the score. A
cross-game streak share communicates "three games, one habit" — the whole
positioning — in a message someone else chose to send.

---

## 2. Existing listicles and aggregators

**Why this is unusually high-value here:** "best Wordle alternatives" articles
*are* the search results for the queries our audience types. Getting added to an
existing ranked post inherits its authority immediately, which is far cheaper
than ranking a new page from zero.

Targets: puzzle-game roundups, "games like Wordle/Semantle/Contexto" posts,
word-game aggregator sites, and browser-game directories.

**How to approach:** email the author, not a generic contact form. Lead with the
one thing that makes WordKrush a *different entry* rather than a duplicate — the
cross-game streak — because an editor's real question is "does this add a row
worth writing." Include a working link, one screenshot, and one sentence. Never
a press release.

**Prerequisite:** Open Graph tags must be live first
([GROWTH-BLOCKERS #2](GROWTH-BLOCKERS.md#2-no-link-preview)). An editor who
pastes the link and sees a blank card will not chase it.

---

## 3. Reddit and puzzle communities

Where the Wordle graduate already is: r/WordGames, r/webgames, r/playmygame,
r/incremental_games (honest cascade/refill angle or skip), r/puzzles, plus
puzzle-focused Discords and the independent-game corners of Mastodon/Bluesky.

Drafts, the reuse ledger, and the link card live in [reddits/](reddits/README.md).
The Cursor skill `.cursor/skills/reddit-ad-posts/` drafts from that folder and
submits in the browser after you name the sub.

**The rules that decide whether this works or backfires:**

- Post as a person who made a thing. "I built a word game hub because I kept
  losing my Wordle streak" is welcome; a brand voice is removed and remembered.
- Read each community's self-promotion rules first. Several have a designated
  day or thread, and violating it is a ban, not a warning.
- Reply to everyone in the first 24 hours. Engagement is what the ranking
  algorithm rewards and what makes the post look alive.
- Ship a visible fix from the feedback and say so. That converts a launch post
  into an ongoing relationship with the community that will carry Phase 2.

**Expectation setting:** a good post is a few hundred players, not thousands,
and the traffic decays within about 72 hours. Its real value is Phase 1
*measurement* — a cohort big enough to read D7 retention from, small enough that
problems are survivable. Treat it as a test, not a launch.

---

## 3b. The game *inside* Reddit — Devvit — **[BUILT 2026-08-23]**

Different from §3, and it should not be confused with it. §3 is a link posted to
a community. This is the game running **in the post itself** — no link-out, no
install, no download. [`reddit/`](../../reddit/README.md), decision STACK D-042.

**Why it is ranked this high despite being new:** it is the only channel on this
list that does not wait for Phase 0. Every blocker in
[GROWTH-BLOCKERS.md](GROWTH-BLOCKERS.md) is about turning a play into a second
player *somewhere else*. Here the post is the share, playing produces a comment,
comments rank the post, and ranking brings players — the loop closes inside
Reddit without a share card, an OG tag, an SEO page, or an Apple account.

**More or Less, not Clueless.** A daily word puzzle has a spoiler problem: the
comment section fills with the answer and poisons the post for everyone who
scrolls past later. More or Less has no single answer to spoil, is one tap with
no learning curve, and every result is a disagreement people want to argue about
in exactly the place the argument is useful.

**The rules from §3 still apply, more strictly.** An app installed into a
community that was not consulted is a removal. Ask the moderators, and do not
run the same thing across several subreddits — Reddit's Responsible Builder
Policy names that specifically.

**What it does not do:** it does not grow wordkrush.com, does not collect an
email, and does not feed the cross-game streak. Reddit owns the audience and can
change the terms. It is a distribution experiment with its own ceiling, and the
web product still needs Phase 0.

**Expectation setting:** the Developer Funds thresholds (500 daily qualified
engagers for $500) are a useful scale marker — that is the order of magnitude a
working daily game post reaches, not a first-week number.

---

## 4. SEO on alternatives intent

The durable channel, and currently closed — the crawler sees one sentence of
JavaScript boilerplate ([GROWTH-BLOCKERS #3](GROWTH-BLOCKERS.md#3-no-search-surface)).

The intent to capture: "wordle alternative", "games like semantle", "daily word
game", "contexto alternative", "free word games no download". These are people
actively looking for exactly this product. [ASSUMED] — the query set is reasoned
from the category; validate volumes with a keyword tool before writing pages
against them.

**What ranks:** a page per game with genuine how-to-play content (the copy
already exists in `src/ui/HowToPlay.tsx`), plus one honest comparison page.
Comparison pages work in this category specifically because the searcher's
intent *is* comparison — but write it straight, including where the incumbents
are better. A page that pretends Wordle has no advantages reads as marketing and
converts worse than one that doesn't.

**Timeline: 2–4 months to meaningful traffic.** [ASSUMED] This is why it is
built in Phase 0 and harvested in Phase 2 — start it before you need it.

---

## 5. The weekly Wordfall drop

A new level every Monday (`../STACK.md` D-027) is a **recurring, legitimate
reason to post** — the hardest thing to manufacture in content marketing, and it
already exists as shipped product behaviour. The ST-78 weekly gauntlet agent
generates the levels, so the marginal cost of the hook is near zero.

Use it as the spine of any social presence: a Monday post, a Tuesday player
email (D-052), a Monday notification once mobile ships. It is an event, not
an ad, which is why it survives in communities that reject promotion.

---

## 6. Discord and group-chat seeding

Word games spread in small closed groups, and the only way in is a member who
brings it. Personal networks, work Slacks, and existing Discords are the seed;
the share loop is what makes the seed grow. Low effort, genuinely effective at
small scale, and impossible to measure directly — accept that.

---

## 7. Product Hunt / Hacker News

**One shot each, so do not spend it early.** Both reward a polished, complete
product and punish an obviously unfinished one, and neither audience is the
Wordle graduate — they are builders. Expect a traffic spike with poor retention.

The real prize is the durable backlink and the credibility for listicle outreach
(§2), not the players. Schedule it in Phase 2 when the product is complete
enough to survive the scrutiny.

---

## 8. Short-form video — **[OPEN]**

TikTok/Reels/Shorts is where casual-game discovery genuinely happens now, and
Wordfall's cascade animation is the kind of satisfying visual that performs
there. But it demands sustained creative output on a platform cadence, which is
a different job from everything else on this list.

**Honest position: do not start this unless someone will own it weekly.** An
abandoned account is worse than no account. Revisit in Phase 2 with a real
answer to "who is making three videos a week."

---

## 9. Paid acquisition — do not

Free product, no monetization, therefore no LTV, therefore no CAC is
recoverable. Every dollar buys a number on a dashboard and nothing else. This is
G-004 and it should stay closed until both a revenue path exists and the Phase 1
retention benchmark in [METRICS.md](METRICS.md) is met.

The trap to watch for: paid feels like progress because the graph moves
immediately. It is the only channel here that can consume the whole budget while
teaching you nothing.

---

## Phase 1 checklist

Everything below is blocked until Phase 0 closes. In order:

- [ ] Confirm Open Graph previews render correctly in iMessage, WhatsApp, Slack, and Instagram DMs
- [ ] Confirm a shared Clueless result contains no spoiler and its link opens the game
- [ ] Draft the founder-voice post (one version, adapted per community — never copy-paste identical text across subreddits)
- [ ] Identify ~10 listicles that already rank for "wordle alternative" and find each author's contact
- [ ] Post to 2–3 communities, staggered across days, not all at once
- [ ] Reply to every comment within 24 hours
- [ ] Hold for 7 days, then read D7 retention before doing anything else
