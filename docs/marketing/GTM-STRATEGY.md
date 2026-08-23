# GTM Strategy

**Last updated:** 2026-08-22
**Status:** Draft for owner sign-off. Nothing here has been executed or tested.
**Read first:** [README.md](README.md) for the one-page summary and decision log.

---

## 1. What we are actually selling

WordKrush is a free daily word-game hub at
[wordkrush.com](https://wordkrush.com) with three games and one streak that
spans all of them.

| Game | Cadence | Score | Closest incumbent |
|---|---|---|---|
| **Clueless** | One secret word per day | Guesses used (lower wins) | Semantle, Contexto |
| **Wordfall** | New level every Monday | Points per level | Boggle, Word Cookies |
| **More or Less** | Endless run | Streak | Higher-Lower, "Ten Times Worse" |

**The honest competitive read:** no individual game here is novel, and each one
faces an entrenched incumbent with years of head start. Leading with any single
mechanic means arguing "our Semantle is better than Semantle," which is a fight
with no natural winner and no reason for anyone to switch.

**The wedge is the hub.** Every major competitor is one game with one daily.
Miss a day, lose the streak, feel bad, churn. WordKrush's streak
(`src/streak/types.ts`) is cross-game: any game played today keeps it alive. A
player who finds today's secret word impossible can still protect the streak
with Wordfall.

That is a genuine retention advantage, it is already built and shipped, and it
is the one claim a competitor cannot copy without rebuilding as a hub.

> **Positioning line (working):** *Three word games. One streak. Miss one, play
> another — the streak survives.*
>
> **[ASSUMED]** — this is reasoned from the mechanic, not tested against
> players. Validate in Phase 1 before it goes into paid placements or the App
> Store description, where copy is expensive to change.

---

## 2. Who this is for

**Primary: the Wordle graduate.** [ASSUMED]

Someone with an established daily word-game habit who has exhausted the novelty
of a single puzzle and actively looks for more. They read "best Wordle
alternatives" listicles, they are in r/wordle and puzzle Discords, and they
already have a slot in their day — commute, coffee, bed — that a word game
fills. They do not need to be taught the habit, only redirected.

This matters because it is the cheapest possible audience: **intent already
exists**, they are concentrated in findable places, and they share results into
group chats as a social reflex. We are not creating demand, we are intercepting
it.

**Secondary: the group-chat cluster.** Word games spread through small closed
groups — a family thread, a work channel — where one person's daily score
becomes everyone's. This audience is unreachable by advertising and reachable
only by a share format good enough that a player wants to paste it. It is
entirely downstream of the share loop in
[GROWTH-BLOCKERS.md](GROWTH-BLOCKERS.md#1-no-share-loop).

**Explicitly not targeting at launch:** children/education (needs COPPA review
and a different content bar), competitive word gamers (Scrabble/anagram
communities want depth and a dictionary fight we would lose), and non-English
speakers (the dictionary is Webster's 1913 per `../STACK.md` D-018 — English
only, and the Clueless semantic model is English-only too).

---

## 3. The growth model

For a free daily puzzle game, growth is a **content-and-loop** business, not a
spend business. The model has four inputs, in strict order of leverage:

```
   fresh daily content  ──▶  a habit worth keeping  ──▶  a result worth sharing
                                                                  │
                              ┌───────────────────────────────────┘
                              ▼
                    a link that renders well  ──▶  a new player
                              │
                              └──▶  indexed pages that keep earning after the push
```

Every arrow is currently broken except the first two. Content is fresh for 24
more days, the habit machinery is genuinely good, and then the chain stops: no
share, no preview, no index.

**Why this ordering and not "just start marketing":** a launch push is a
one-time impulse. If the loops exist, that impulse compounds — each cohort
shares, each share is indexed, and traffic six months later exceeds launch week.
If they don't, the impulse decays to zero and the only asset you bought is one
cohort's retention. The same effort spent two weeks later is worth multiples
more. That is the entire argument for G-001.

**Why not paid (G-004):** there is no monetization, so there is no LTV, so any
CAC is unrecoverable. Paid acquisition for a free game with no revenue model is
buying a number on a dashboard. Revisit only when both a revenue path and the
Phase 1 retention benchmark exist.

---

## 4. The phased plan

Dates assume today, **2026-08-22 (Saturday)**. The binding constraint is the
Clueless wrap on **2026-09-16 (Wednesday)**.

### Phase 0 — Fix the loops (2026-08-22 → 2026-09-05)

**Goal: make the product capable of growing.** No promotion in this window.

The full ranked list with implementation notes is in
[GROWTH-BLOCKERS.md](GROWTH-BLOCKERS.md). In brief:

1. **Refill Clueless to 90+ puzzles** — the hard gate (G-002). Nothing else
   matters if the daily repeats.
2. **Ship the share loop** — spoiler-free result card, one tap to clipboard.
3. **Restore Open Graph tags** — so a shared link renders as WordKrush.
4. **Build a crawlable surface** — a real landing page, `robots.txt`, `sitemap.xml`.

Exit criteria: all four done, plus a manual test that a shared Clueless result
pasted into iMessage and WhatsApp renders a WordKrush preview card and the link
opens the game.

### Phase 1 — Soft launch to communities (2026-09-08 → 2026-09-21)

**Goal: validate retention and the share rate on real players, at a volume where
problems are survivable.** Target is a few hundred players, not thousands.

Post where the Wordle-graduate audience already is, in the register those
communities accept — as a person who made a thing, never as a brand. Channel
detail and per-community rules are in [CHANNELS.md](CHANNELS.md).

This phase is measurement, not scale. The questions it answers:

- Do players come back on day 2 and day 7? (The only question that matters.)
- Do they share? At what rate?
- Does the "one streak, three games" line land, or do people describe the
  product back to us differently?
- Which of the three games do people actually play, and does the hub help or
  just dilute attention?

**Do not proceed to Phase 2 if D7 retention is below the benchmark in
[METRICS.md](METRICS.md).** A leaky product scaled is just a faster leak, and
the fix is a product fix, not a bigger push.

### Phase 2 — Compound the durable channels (2026-09-21 onward)

**Goal: turn the Phase 1 cohort into traffic that keeps arriving.**

- **SEO on alternatives intent** — the pages built in Phase 0 start ranking.
  This is slow (2–4 months to meaningful traffic) and it is the only channel
  that still pays after you stop working on it. [ASSUMED]
- **Listicle and aggregator placement** — "best Wordle alternatives" posts are
  themselves the top search results. Getting into existing ones is higher
  leverage than writing new ones.
- **Weekly Wordfall drop as a recurring hook** — a Monday drop is a reason to
  post every week without it being an ad. The content already exists (ST-78).

### Phase 3 — Mobile (gated on Phase 1 proof, no date)

Blocked on owner purchases per `../ROADMAP.md`. App Store presence is worth real
organic discovery, but Guideline 4.2 is a live rejection risk for a casual game
(`../STACK.md` D-002), and the mitigations listed in
`docs/BRAINSTORM.md` §9 should all be in place before submitting. Do not spend
the $99 and the review cycles until web retention proves the product deserves
them.

---

## 5. What would make this strategy wrong

Stated up front so we can notice rather than rationalize.

| If we observe | It means | Do this instead |
|---|---|---|
| Strong D7 retention but near-zero share rate even after the loop ships | The games are fun but results aren't *interesting* to share — the share format is the problem, not the reach | Redesign the share card; consider a head-to-head or streak-comparison format rather than a score grid |
| High share rate but poor D7 | Novelty spike, no habit. Growth would be a leaky bucket at any scale | Stop acquisition entirely; fix the core loop before spending another hour on channels |
| Players only ever play one of the three games | The hub premise is wrong and the cross-game streak is a solution to a problem nobody has | Re-position on the strongest single game and treat the others as bonus content |
| Organic traffic arrives before we do anything | Something is already working that this audit didn't see (the Instagram DM hints at this) | Find the source first — it is more valuable than any planned channel |

---

## 6. Sequencing summary

| Window | Phase | The one thing |
|---|---|---|
| 2026-08-22 → 09-05 | Fix the loops | Clueless content + share + OG + SEO surface |
| 2026-09-08 → 09-21 | Soft launch | Measure D7 retention on a few hundred real players |
| 2026-09-21 → | Compound | SEO and listicles; weekly Wordfall as the recurring hook |
| Gated | Mobile | Only after web retention proves it |

The single most important line in this document: **the Clueless daily wraps on
2026-09-16, and nothing in Phase 1 should start before that is fixed.**
