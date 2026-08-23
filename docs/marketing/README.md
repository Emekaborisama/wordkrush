# Marketing & GTM

**Last updated:** 2026-08-22
**Status:** Strategy drafted, nothing executed. No launch has happened.
**Audience:** Whoever (human or LLM) runs growth for WordKrush. Read this file first.

This directory holds the go-to-market strategy. It follows the same conventions
as the rest of `docs/`: claims are tagged by confidence, decisions carry their rationale in
a table, and a correction log records what reality overturned.

- **[GIVEN]** — stated by the project owner, or verified in the codebase. Reliable.
- **[ASSUMED]** — inference from category convention. Needs validation.
- **[OPEN]** — unresolved. Do not spend money or a launch window against it.

---

## The one-page read

WordKrush has a **retention engine and no distribution engine.** The daily
streak, the global leaderboard, the daily Clueless puzzle and the Monday
Wordfall drop are all built and live at [wordkrush.com](https://wordkrush.com).
None of the machinery that turns a player into two players exists.

Three gaps, all verified in the codebase on 2026-08-22:

1. **No share.** `game_over_action` in `src/analytics/events.ts` tracks
   `play_again | scores | home`. There is no share action, and no share control
   in `src/ui/screens/GameOverScreen.tsx`. For a daily word game, the
   spoiler-free result share is the primary acquisition loop. It is absent.
2. **Link preview.** `scripts/patch-web-head.mjs` now ships
   `reddits/assets/og-share.png` as `/og.png` with absolute Open Graph tags.
   Still blank on the live site until that build deploys and the URL is re-scraped.
3. **No search surface.** `app.json` sets `web.output: "single"`, so a crawler
   fetching wordkrush.com receives exactly one sentence: *"You need to enable
   JavaScript to run this app."* There is no `robots.txt` and no `sitemap.xml`.
   "Wordle alternative" search intent — the largest durable channel in this
   category — is completely closed.

And one clock, which sets the whole schedule:

> **The Clueless daily wraps on 2026-09-16.** `todaysPuzzleNumber()` in
> `src/data/clueless/index.ts` runs modulo 30 against a 2026-08-17 epoch. There
> are 30 puzzles. Today is #6. On 2026-09-16 the game silently serves puzzle #1
> again to everyone who has been playing since launch.

So the recommendation is: **do not launch yet.** Acquisition spent before the
loops exist is water poured into a bucket with no bottom, and a launch that
succeeded would run into repeated puzzles inside a month. Fix the loops and
refill the content first — roughly two weeks of work — then push.

**One exception, built 2026-08-23.** All three gaps above are about turning a
play into a second player *somewhere else*. The Reddit app
([`reddit/`](../../reddit/README.md), STACK D-042) runs More or Less **inside a
Reddit post**, where the post is the share, nothing links out, and Reddit's own
ranking is the search surface. None of the three gaps apply, and neither does
the Clueless clock — More or Less has no daily rotation to exhaust. It is ready
and blocked only on `devvit login`, a subreddit that has said yes, and app
review. See [CHANNELS §3b](CHANNELS.md).

The wedge, once you do push: **one streak, three games.** Every competitor in
this category is a single game with a single daily. Miss a day of Wordle and the
streak is gone. WordKrush's streak (`src/streak/`) spans all three games, so a
player who isn't in the mood for the secret word can keep the streak with
Wordfall. That is a real retention difference and it is already built.

---

## Documents

| File | What it answers |
|---|---|
| [GTM-STRATEGY.md](GTM-STRATEGY.md) | Who this is for, how it's positioned, the growth model, and the phased plan with dates |
| [GROWTH-BLOCKERS.md](GROWTH-BLOCKERS.md) | The ranked product gaps that must close before acquisition spend makes sense, with implementation notes |
| [CHANNELS.md](CHANNELS.md) | Channel-by-channel playbook — effort, expected value, and the honest case against the ones we're skipping |
| [METRICS.md](METRICS.md) | What to measure and what "working" looks like, given consent-gated analytics |
| [reddits/](reddits/README.md) | Reddit lane — drafts, post ledger, link-preview card |

Read them in that order. `GROWTH-BLOCKERS.md` is where the actionable work is.
Reddit posting lives in `reddits/` so it is not mixed into the strategy files.

---

## Decision log

Marketing decisions get `G-0xx` ids, mirroring the `D-0xx` convention in
`../STACK.md`. Never delete a row; supersede it.

| Id | Date | Decision | Rationale | Status |
|---|---|---|---|---|
| G-001 | 2026-08-22 | **Do not run any acquisition push until the share loop, link previews, and a search surface all ship** | All three are verified missing. A daily word game grows through shared results and "games like X" search; both paths are closed today. Traffic driven now converts at the same rate but propagates at zero, so the spend buys one cohort instead of compounding. Cost of waiting is ~2 weeks. | Proposed |
| G-002 | 2026-08-22 | **The Clueless content runway is the launch gate.** No public push before the daily puzzle pool covers 90+ days | The pool wraps to puzzle #1 on 2026-09-16. Acquiring players into a game that repeats its daily within weeks converts a retention win into a visible defect. | Proposed |
| G-003 | 2026-08-22 | **Positioning is "one streak, three games," not any single game's mechanic** | Clueless is a Semantle/Contexto-style game, More or Less is a higher-lower game, Wordfall is a word-trace game. Individually none is novel and each faces an entrenched incumbent. The hub plus a cross-game streak is the only structurally defensible claim, and it is already shipped. | Proposed |
| G-004 | 2026-08-22 | **No paid acquisition in 2026** | The product has no monetization, therefore no LTV to pay against, so any CAC is pure loss with no payback model. Paid is reconsidered only after a retention benchmark is met (see METRICS.md) and a revenue path exists. | Proposed |
| G-005 | 2026-08-22 | **Web is the launch platform; iOS/Android follow retention proof** | The App Store path is blocked on owner purchases (Apple Developer Program, Expo login) per `../ROADMAP.md`, and Guideline 4.2 risk is real for a casual game (`../STACK.md` D-002). Web costs nothing to distribute, is linkable, and is where share loops and SEO actually compound. | Proposed |

**All five are `Proposed`, not `Active`** — they need the owner's sign-off. Per
`../ROADMAP.md`, decisions that commit money or a launch window are the
owner's call, not an agent's.

---

## Open questions for the owner

These block execution and no amount of code resolves them.

1. **[OPEN] Is there a monetization intent at all?** Free forever, ads,
   one-time unlock, or subscription? This changes whether retention or reach is
   the goal, and it is the single input that decides whether G-004 ever flips.
2. **[OPEN] What is the appetite for content operations?** The Clueless pool
   needs a generator run and human review to reach 90+ days
   (`validator/ → app.clueless.build`). Wordfall already has a weekly agent loop
   (ST-78). Is someone reviewing weekly, or does this need to be fully automated?
3. **[OPEN] Is there an existing audience to launch into?** Any mailing list,
   personal following, or community membership changes Phase 1 substantially.
   The Instagram DM in the original report suggests some organic sharing is
   already happening.
4. **[OPEN] Brand-safety limit on Clueless answers.** A daily word game gets
   screenshotted; one crude or politically loaded answer becomes the story. Who
   signs off on the word list?

---

## Correction log

Append whenever reality overturns something here. Never delete a row.

| Date | Item | Change |
|---|---|---|
| 2026-08-22 | — | Directory created. Strategy derived from a codebase audit at commit `5ca2a6b`; no market testing, no analytics data, and no launch has occurred. Every projection is a benchmark from category convention, not a forecast. |
