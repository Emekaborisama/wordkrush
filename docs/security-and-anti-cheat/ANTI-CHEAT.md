# Anti-Cheat Strategy

**Last updated:** 2026-08-22
**Covers:** integrity of the global leaderboard only. Player-data and platform concerns are in [PLATFORM-SECURITY.md](PLATFORM-SECURITY.md).
**Findings referenced:** SEC-01 … SEC-10 in [THREAT-MODEL.md](THREAT-MODEL.md#findings-against-the-current-code).

---

## The premise

An offline-first game cannot be made cheat-proof. D-004 puts the dictionary,
the puzzle ranks, and the category values on the player's device; D-016 keeps
the game playable with no network at all. The answer key is in the attacker's
hands and that is a feature, not an oversight.

What *is* achievable, and what this strategy delivers:

- Forging a ranked score costs meaningfully more than playing honestly.
- Forgeries are detectable after the fact, from evidence the submission itself
  carried.
- A forgery that succeeds is contained — silently, and without collateral
  damage to honest players.
- The product never claims more integrity than it can demonstrate.

That last one is a design constraint, not a nicety. A board labelled "verified"
that is not verified is worse than an honest board labelled "personal bests".

The one large asset on our side: **the engines are pure seeded reducers**
(agents.md, D-024). `(state, action, context) => state`, no hidden state, no
`Math.random()` inside gameplay. A server can re-run the identical function
over the identical inputs and get a bit-identical result. Every verification
idea below is cheap *because* of that, and this is the concrete payoff for the
purity rule the repo has been enforcing all along.

---

## The two-board split

**The single most important structural decision.** Today `global_scores` holds
both self-seeded free play and anything else, and ranks them together — so the
whole board inherits the guarantee of its weakest entry, which is none.

A run on a client-chosen seed (SEC-03) can never be trusted: the player picks
the board, solves it offline at leisure, and submits a run that is genuinely
correct. No verifier can tell that from skill. A run on a **server-issued seed,
published only when its window opens**, has a bounded solve window and a full
evidence trail.

These are different products and need different boards.

![The two-board split. A client-chosen seed gives an unbounded solve window and a run that is genuinely correct, which no verifier can distinguish from skill, so it may only ever be a personal best. A server-issued seed withheld until the window opens gives a bounded window, one entry per challenge, and a replayable action log — the only path that earns a global rank.](diagrams/two-board-split.svg)

| | **Casual** | **Ranked** |
|---|---|---|
| Seed | Client (`randomSeed()`) | Server-issued, published at window open |
| Entries | Unlimited | One per challenge |
| Verification | Impossible, so none | Mandatory: plausibility → replay → behavioural |
| Shown as | Personal best, friends | The global leaderboard |
| If backend is down | Plays and records locally | Plays; ranks when it can submit |

Ranked windows map onto content cadence that **already exists** — Clueless is
daily, Wordfall drops Mondays (D-027), More or Less gets a daily seed. No new
content machinery is required.

Casual play keeps its local board and its history exactly as today. Nothing a
player currently has is taken away; the change is that free-play numbers stop
being presented as a global ranking they were never able to support.

> **[DECIDE]** Does casual keep any global board? Recommendation: **no.**
> Personal best and friends only. Publishing numbers we know are unverifiable
> is the thing that costs trust.

---

## Defence in four tiers

Each tier catches what the previous cannot. Deploy in order — every tier is
useful on its own, and tiers 0 and 1 are pure backend work needing no client
release, which matters while web is the only live surface.

![Four tiers of defence. A submission passes Tier 0 structural SQL checks, then Tier 1 replay verification, then Tier 2 behavioural scoring, before becoming a ranked entry. Tiers 0 and 1 reject into a retained, never-shown store; Tier 2 only flags into a human review queue.](diagrams/defence-tiers.svg)

<details>
<summary>Text version</summary>

```
 SUBMISSION
     │
     ├─ TIER 0  Structural       is this shape even legal?        SQL/RLS   · hours
     │          rejects: fabricated numbers, floods, replays of old windows
     │
     ├─ TIER 1  Replay           does the run reproduce?          worker    · days
     │          rejects: any score not backed by a real sequence of moves
     │
     ├─ TIER 2  Behavioural      does a human appear to have played it?     · weeks
     │          flags: bots, solvers, assisted play — the SEC-03 attack
     │
     └─ TIER 3  Containment      what happens to what we caught?  policy
                silent exclusion, sanction ladder, no feedback to the author
```

</details>

---

## Tier 0 — Structural

**Costs hours, stops the most likely attacker.** All SQL and policy; no client
release, no worker.

### 0.1 Server-issued challenge seeds

Closes SEC-03 and SEC-05 together. A `challenges` table is the authority on
what may be played and when:

```sql
create table challenges (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null check (game_id in ('more-or-less','clueless','wordfall')),
  -- The window this challenge is the ranked one for: '2026-08-24' daily,
  -- '2026-W35' weekly. Unique per game so a window has exactly one board.
  period_key  text not null,
  -- Generated server-side from a secret. NEVER derived from the date alone:
  -- seedFromDate() is a public function over a public calendar, so a seed it
  -- produces is an announcement, not a secret (SEC-05).
  seed        bigint not null,
  opens_at    timestamptz not null,
  closes_at   timestamptz not null,
  unique (game_id, period_key)
);
```

The seed must be **withheld until `opens_at`** — otherwise the whole exercise
fails and we have rebuilt SEC-05 with extra steps. Enforce it in the policy,
not in the client:

```sql
alter table challenges enable row level security;
create policy challenges_read_open on challenges
  for select using (now() >= opens_at);
```

Rows are generated ahead of time by a service-role job (the same GitHub Actions
cron pattern as D-036) and become readable when the window opens. No client
UPDATE or INSERT policy.

### 0.2 One ranked entry per challenge

Closes SEC-04 far more strongly than any rate limit, because it is a schema
invariant rather than a threshold to tune:

```sql
alter table global_scores add column challenge_id uuid references challenges(id);
create unique index global_scores_one_per_challenge
  on global_scores (player_id, challenge_id) where challenge_id is not null;
```

A ranked submission must name an open challenge, and it gets exactly one shot —
which is also the correct *game design* for a daily puzzle. Retry-after-failure
is what turns a daily into a grind.

### 0.3 Plausibility constraints

Cheap CHECKs that reject the laziest forgeries before anything expensive runs.
The spirit of `guesses_match_streak` in 0002, extended:

- **Per-game score ceilings.** `score <= 1000000000` is not a bound, it is a
  column type. Real ceilings come from the same simulation that calibrated
  Wordfall's level targets (D-019): take the perfect-solver score and allow
  headroom. Clueless is bounded by vocabulary size. More or Less needs a
  streak ceiling.
- **Minimum plausible duration.** A 50,000-point Wordfall level in 1 ms is not
  a fast player (SEC-10). Floor it per game, generously.
- **`played_at` inside the challenge window**, with tolerance for clock skew —
  and bounded against `now()` so entries cannot be dated into the future.
- **`score` consistent with `duration_ms`** where the game bounds the rate at
  all: Wordfall's move budget caps how much scoring can happen per second.

### 0.4 Stop ranking unverified rows

Closes SEC-01's *presentation* half, and it is the one item that should not
wait for anything else. Until the verifier exists, `global_leaderboard` must
either filter to `status = 'verified'` (empty until Tier 1 lands — honest) or
the surface must stop calling itself a ranking. `parseGlobalScores` already
carries `verified` through to the UI; today nothing acts on it.

---

## Tier 1 — Replay verification

**Restores what SEC-02 removed.** This is the tier the architecture was built
for.

### 1.1 Submit the action log, not just the number

`proof jsonb` exists and is never written. Fill it with the run:

```jsonc
{
  "v": 1,
  "challenge_id": "…",
  "seed": 1234567890,
  "actions": [ /* the exact Action union the reducer consumes */ ],
  "timings": [ 0, 812, 1503, … ]   // ms from run start, per action — Tier 2 input
}
```

The action types already exist and are already serialisable — Wordfall's
`Action` union in [engine.ts:39](../../src/games/wordfall/engine.ts#L39-L57),
Clueless's in [engine.ts:9](../../src/games/clueless/engine.ts#L9-L14). No new
game-side concepts, and no new state: the log is what the UI already
dispatches.

Reinstate 0002's structural check in the new shape — an action count
inconsistent with the claimed score is rejected in SQL, before a worker is
woken.

Size is bounded by the move budget (a Wordfall level is tens of actions), so
this is kilobytes. `restore` and `restart` actions must be **rejected** in a
ranked log, not replayed — they are how a run would otherwise be spliced.

### 1.2 The verifier worker

A service-role job that reads `unverified` ranked rows, replays each, and sets
`status`. Two properties make or break it:

1. **It imports the real engine.** `src/games/*/engine.ts` is platform-free by
   the agents.md rules — no React, no storage, no network — so a Node worker
   imports it directly. A reimplementation would drift from the game and start
   rejecting honest players, which is the worst possible failure.
2. **It is the only actor that writes `status`.** No client policy grants it;
   that is already true and must stay true.

Verification is `newGame(ctx, challenge.seed)`, fold the actions through
`reducer`, compare the resulting score to the claim. Mismatch → `rejected`.
Match → `verified`.

**Where it runs** is a `[DECIDE]`: a Supabase Edge Function on insert
(immediate, adds a runtime dependency) or a GitHub Actions cron (reuses the
D-036 pattern this repo already operates, at minutes of latency). Recommendation
is **cron**, for consistency with existing operational practice; a board that
verifies within minutes is fine, and the "verifying…" state is honest UI.

Availability rule: if the verifier is down, submissions keep landing as
`unverified` and simply do not rank yet. It must never block play or
submission (README principle 2).

---

## Tier 2 — Behavioural detection

**The only tier that catches SEC-03**, where a bot plays the real challenge on
the real seed and produces a run that replays perfectly. Nothing structural can
distinguish that from skill. Only *how it was played* can.

Signals available from the Tier 1 action log, none requiring new instrumentation:

| Signal | Why a bot differs |
|---|---|
| **Inter-action timing** | Humans have a long, right-skewed think-time distribution. Scripts are tight and near-uniform; a driven UI is quantised to a frame or interval. |
| **Word-order in Wordfall** | The shipped solver enumerates by value. A run that plays words in descending solver order, repeatedly, is reading the solver's output — the SEC-03 attack, visible directly. |
| **Absence of error** | Humans backtrack, submit invalid words, cancel traces. `rejection` states in the log are a *positive* human signal, and their total absence across runs is not. |
| **Trace-path shape** | Human drags overshoot and correct; computed paths are minimal. |
| **Cross-run variance** | Real skill is noisy. A player whose every daily is within a point of optimal is not a player. |
| **Time-to-first-action after `opens_at`** | Solving requires the seed. A perfect run submitted seconds after a window opens had a head start it should not have had. |

**Output is a suspicion score, not a verdict.** Tier 2 feeds a review queue —
the same posture as the content pipeline's flagged-pairs queue (ROADMAP,
"Human review queue for flagged pairs"), and for the same reason: a
probabilistic signal must not silently punish, because the cost of falsely
excluding a genuinely excellent player is losing exactly the player the
competitive board exists for.

Build this only once the board carries enough traffic that a bot is worth
writing. Tiers 0 and 1 are the ones that pay for themselves immediately.

---

## Tier 3 — Containment

### Silent rejection

Both schemas already retain `rejected` rows and hide them from the board. Keep
that, and keep it silent: a rejected submission looks accepted to its author
and simply never appears. Telling a cheater which check caught them is free
tuning data for the next attempt (README principle 5).

The retained rows are the abuse corpus — the input that makes Tier 2 tunable.

### Sanctions

**[DECIDE]** — the owner's call. Recommended ladder, each step reversible:

1. **Entry rejected.** Default for any failed verification. No account action;
   a bug in our verifier must not cost a player their account.
2. **Player excluded from ranked boards**, local play and history untouched
   (README principle 3). For repeated, unambiguous forgery.
3. **Account terminated.** Reserved for abuse beyond scoring — harassment,
   automated account farming.

The asymmetry is deliberate: step 1 is cheap and reversible and should be the
answer to almost everything. Steps 2 and 3 need human review, because at
current scale a false positive costs more than a cheater does.

### What we do not do

- **No client-side bundle obfuscation or tamper checks** (README principle 6).
- **No banning by IP or device fingerprint.** Collateral damage on shared
  networks, ineffective against anyone using a VPN, and a privacy posture that
  contradicts D-022.
- **No retroactive wipes of honest history.** If a board must be reset because
  it cannot be verified, say so plainly and reset it once.

---

## Sequencing

| Phase | Ship | Closes | Client release? |
|---|---|---|---|
| **Now** | Stop ranking unverified rows (0.4); plausibility CHECKs (0.3); fix `leaderboard_top` and stop exposing `seed` to `anon` | SEC-01 presentation, SEC-05 half, SEC-08, SEC-10 | No |
| **Next** | `challenges` table, one-entry-per-challenge, seed withheld to `opens_at` | SEC-03, SEC-04, SEC-05 | Yes |
| **Then** | Write `proof`; verifier worker; `status` becomes real | SEC-01, SEC-02 | Yes |
| **Later** | Behavioural scoring + review queue | SEC-03 residual | No |

The *Now* column is hours of SQL against a live database and is the difference
between a board that is wrong and a board that is honest about what it knows.

Before any GTM push points players at the leaderboard, phases *Now* and *Next*
must be done — see [GTM.md](../GTM.md). A launch that drives traffic at a
forgeable board converts marketing spend into a trust problem.
