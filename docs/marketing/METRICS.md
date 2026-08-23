# Metrics

**Last updated:** 2026-08-23
**Status:** Draft. No baseline exists — no launch has run and no analytics data has been collected.
**Read first:** [GTM-STRATEGY.md](GTM-STRATEGY.md).

How we will know whether any of this is working, given a deliberately
privacy-limited analytics setup.

---

## The constraint that shapes everything

Per `../STACK.md` D-040, PostHog is **opted out by default**. Guests stay
anonymous. After consent, signed-in players are identified with account id,
username, and email. Session replay, autocapture, and remote flags stay
disabled. `src/analytics/privacy.ts` and the event dictionary in
`src/analytics/events.ts` still enforce bounded, bucketed play properties —
note that scores are reported as buckets (`streak_bucket`, `score_delta_bucket`)
rather than raw values in most events.

Guessed content stays out. The remaining constraint is consent coverage:

| Not available | Why |
|---|---|
| Totals for every player | Only consenting players are counted at all |
| Unsigned-in cross-device retention | Guests stay on a device identifier |
| Source attribution for declined analytics | No PostHog events without consent |

**The consequence to internalize: every client-side number is a floor, not a
count, and the ratio of the floor to reality is unknown.** Someone reading a
PostHog dashboard cold will conclude growth is failing when it may not be.
Compare a metric to its own history, never to an absolute target.

---

## Three sources of truth, in order of reliability

1. **Supabase** — the leaderboard tables (migrations `0002`, `0003`) and unique
   usernames (`0004`). These are **actual rows for actual signed-in players**,
   unaffected by analytics consent. This is the most trustworthy retention
   signal available, limited to players who signed in.
2. **Railway request logs** — unique-ish traffic and referrers at the HTTP
   layer, unaffected by consent. Good for "did the Reddit post drive traffic,"
   useless for "did they come back."
3. **PostHog** — rich behavioural detail (which games, where players quit, share
   rate) from the consenting subset. Best for **ratios and shapes**, actively
   misleading for totals.

Read them together. A Reddit spike in Railway logs plus flat Supabase signups
means the landing experience is failing, and neither source shows that alone.

---

## The North Star

> **Day-7 streak retention** — of players who complete a run, the share who
> still have a live streak seven days later.

Why this one: for a daily game, the streak *is* the product. It is the metric
the cross-game hub is designed to move (a single-game competitor loses the
player on their first uninterested day), so it directly tests the core
positioning bet from G-003. And `src/streak/types.ts` already computes it — no
new instrumentation needed for signed-in players.

Everything else is diagnostic.

---

## Phase 1 benchmarks

These are **category benchmarks and hypotheses, not forecasts.** [ASSUMED]
Nobody has data on this product. Their purpose is to make Phase 1 falsifiable in
advance so the result can't be rationalized after the fact.

| Metric | Weak | OK | Strong | Read it from |
|---|---|---|---|---|
| D1 return | <20% | 25–35% | >40% | Supabase play dates |
| **D7 streak retention** | <10% | 15–25% | >30% | `src/streak/` + Supabase |
| Share rate (shares ÷ completed runs) | <3% | 5–10% | >15% | PostHog ratio |
| Games played per player | ~1.0 | 1.3–1.8 | >2.0 | PostHog `game_selected` |
| Run completion rate | <50% | 60–75% | >80% | `run_started` vs `run_completed` |

**"Games played per player" is the one that tests the whole strategy.** If it
sits at 1.0, players are treating WordKrush as one game with two ignorable
extras, the hub premise is wrong, and G-003 needs to be reversed — re-position
on the strongest single game. It is the cheapest possible test of the central
bet, and it comes free from existing events.

### The decision rule

**If D7 streak retention is below ~10% after Phase 1, stop acquisition entirely
and fix the product.** Scaling a leaky bucket makes a faster leak, and no
channel on [CHANNELS.md](CHANNELS.md) compensates for players who don't come
back. This rule exists to be honoured when it's inconvenient.

---

## Instrumentation needed before Phase 1

Small additions, all consistent with the existing privacy policy — bucketed,
bounded play properties, no guessed content.

- [ ] **`'share'` added to `game_over_action.action`** — currently
      `'play_again' | 'scores' | 'home'`. Without it, share rate is unmeasurable
      on the day the loop ships.
- [ ] **`share_completed` event** — `{ game_id, surface: 'result' | 'streak', method: 'native' | 'clipboard' }`.
      Distinguishing native-sheet from clipboard matters because they behave
      very differently on web vs mobile.
- [x] **`landing_viewed`** on first web paint (and native deep links that are
      not auth callbacks), with a bounded `entry_source` so paid / search /
      social / share / direct can be distinguished. Static marketing pages can
      reuse the same event when they exist.
- [ ] **Referrer bucketing at the server** — group Railway referrers into
      `search | social | direct | listicle`. Server-side, so consent does not
      apply and no personal data is stored.

Add each to `ANALYTICS_EVENT_NAMES` in `src/analytics/events.ts`, or the runtime
drops them — the dictionary is enforced, which is a feature.

---

## What not to measure

Guarding against the metrics that feel productive and mislead:

- **Total registered users.** A signup with no second session is not a player.
  D7 retention is the honest version of the same question.
- **Pageviews.** Measures the size of the last post, not the health of the
  product.
- **Social followers.** Uncorrelated with players for a game whose growth is
  group-chat shares.
- **Time in app.** Ambiguous by design — a fast Clueless solve is a *good*
  session. Optimizing this would push toward wasting players' time.

---

## Reporting cadence

- **Weekly during Phase 1** — the five benchmark metrics, plus one sentence on
  what changed and what it implies. Long enough to see a trend, short enough to
  react.
- **Monthly after Phase 2 starts** — add search impressions and rankings, which
  move too slowly for a weekly read.
- **After every community post** — a 72-hour readout, since that is the full
  lifespan of the traffic.

Record the numbers somewhere durable and append-only, so the correction log in
[README.md](README.md) can be filled in with what actually happened rather than
what was expected.
