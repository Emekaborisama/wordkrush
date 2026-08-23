# Security & Anti-Cheat

**Last updated:** 2026-08-22
**Status:** Strategy. Nothing in the *Proposed* sections is implemented yet.
**Scope:** the WordKrush client, the Supabase runtime (accounts + global leaderboards), the content factory, and the Railway web deployment.

This directory is the source of truth for how WordKrush protects **player trust
in the global leaderboard** and **the safety of player data**. It exists
because D-016 made Supabase a runtime dependency and D-025 put a public,
cross-player leaderboard in the product — the moment a number becomes public
and comparable, someone will forge it.

Doc boundaries: [STACK.md](../STACK.md) = *what we chose* · [HOW-IT-WORKS.md](../HOW-IT-WORKS.md) = *how the built system behaves* · this directory = *what we defend, against whom, and how*.

| File | What it covers |
|---|---|
| [THREAT-MODEL.md](THREAT-MODEL.md) | Assets, adversaries, attack surface, and every finding against the code as it stands today |
| [ANTI-CHEAT.md](ANTI-CHEAT.md) | Leaderboard integrity: seed authority, replay verification, bot detection, sanctions |
| [PLATFORM-SECURITY.md](PLATFORM-SECURITY.md) | RLS, auth and Sybil resistance, secrets, web headers, trust & safety, dependencies |
| [INCIDENT-RESPONSE.md](INCIDENT-RESPONSE.md) | What to do when a board is poisoned or a key leaks |

Honesty tags, as in HOW-IT-WORKS: **[BUILT]** exists in the repo · **[PLANNED]**
designed here, not implemented · **[DECIDE]** needs the owner's call before
anyone codes it.

---

## The one-page verdict

**Player data handling is in good shape. The global leaderboard has no
integrity mechanism at all and should not be presented as a ranking until it
does.**

The secrets boundary is genuinely well drawn — `.env.example` documents the
`EXPO_PUBLIC_` rule explicitly, the secret key is never prefixed, and only
`pipeline/db.ts` touches it. Analytics is opt-in, bounded to an event
allowlist, and unjoined to account identity (D-022). Row Level Security is
enabled on every runtime table, entries are immutable by design, and the
comment in `0002_leaderboard.sql` — *"Editing your own score after the fact is
the whole attack"* — shows the right instinct was there from the start.

The problem is that the instinct did not survive into the table the app
actually writes to. `leaderboard_entries` (migration 0002) stores `seed` **and**
`guesses[]`, with a CHECK constraint tying the array length to the claimed
streak, so a server could replay the run and confirm it. `global_scores`
(migration 0003) is the table [`submitGlobalScore`](../../src/scores/global.ts)
writes to, and it kept the `seed` but dropped the guesses. Its `proof jsonb`
column — the intended replacement — is never written to. Its `status` column
defaults to `'unverified'` and no code in this repo ever changes it, because
the only actor permitted to is a service-role verifier that does not exist.

The practical consequence: anyone can take the publishable key out of the web
bundle, request a magic link to a disposable inbox, and `POST` a score of
999,999,999 straight to the REST API. Nothing in the schema, the policies, or
the client stands in the way. The board is currently a list of numbers players
asserted about themselves.

Every finding, with severity and evidence, is in
[THREAT-MODEL.md](THREAT-MODEL.md#findings-against-the-current-code).

---

## The strategic position

Three constraints are fixed by decisions already made, and the strategy has to
live inside them rather than argue with them:

1. **The game is offline-first and fully playable with no network** (D-004,
   D-016). The dictionary, the puzzle ranks, and the category values all ship
   in the bundle. **The answer key is on the attacker's device.** No amount of
   client hardening changes that.
2. **The client chooses its own seed.** `randomSeed()` in
   [rng.ts](../../src/games/rng.ts#L29-L31) is `Math.random()`, and the seed
   travels with the score. A player can pick a seed, solve that board offline
   at leisure, and submit a run that is *genuinely correct*.
3. **The engines are pure seeded reducers** (agents.md, D-024). This is the
   asset. A server can re-run the exact same function over the exact same
   inputs and get the exact same answer, with no reimplementation to drift out
   of sync.

Constraints 1 and 2 mean **perfect anti-cheat is not achievable and should not
be attempted.** Constraint 3 means *verifiable* anti-cheat is cheap, because
the hard architectural work is already done.

So the strategy is not "stop cheating". It is:

> **Separate the boards that need integrity from the boards that don't, make
> the ranked ones expensive to forge, and make forgery detectable after the
> fact.**

### The decision everything else hangs on

Today one table serves two incompatible purposes. A free-play run on a
self-chosen seed is unverifiable by construction; a challenge run on a
server-issued seed can be verified completely. Mixing them means the whole
board inherits the weaker guarantee.

**Proposed:** split them.

| Board | Seed | Verification | Presented as |
|---|---|---|---|
| **Casual** | Client-chosen (`randomSeed()`) | None possible | Personal bests + friends. **Never a global rank.** |
| **Ranked** | Server-issued, published when the window opens | Mandatory replay + plausibility | The global leaderboard |

This costs one migration and one screen label, and it converts an unfixable
problem into a solved one. Full design in
[ANTI-CHEAT.md](ANTI-CHEAT.md#the-two-board-split).

---

## Priority order

Ordered by damage prevented per hour spent. Items 1–3 are SQL and policy work
with no client release required, which matters because the web build is the
only live surface today.

| # | Work | Fixes | Effort |
|---|---|---|---|
| 1 | Stop presenting unverified rows as a ranking — show `verified` only, or label the board honestly | SEC-01 | Hours |
| 2 | Plausibility CHECKs + per-player insert quota on `global_scores` | SEC-01, SEC-04, SEC-10 | Hours |
| 3 | Bring `leaderboard_top` in line with `global_leaderboard` (`security_invoker`); stop exposing `seed` to `anon` | SEC-05, SEC-08 | Hours |
| 4 | Security headers on `server/serve.mjs` | SEC-09 | Hours |
| 5 | Server-issued challenge seeds (`challenges` table + one-entry-per-challenge) | SEC-03, SEC-05 | Days |
| 6 | Write the action log into `proof`; build the replay verifier worker | SEC-02 | Days |
| 7 | Display-name moderation before the board is promoted publicly | SEC-06 | Days |
| 8 | Behavioural bot scoring over the action log | SEC-03 | Weeks |

Item 1 is the one that cannot wait. Everything else is engineering; that one is
a claim the product is making to players that is not currently true.

---

## Standing principles

These are not negotiable per-feature. If a proposal breaks one, it needs a
STACK decision, not a code review comment.

1. **The client is not trusted.** Every number it sends is a claim. Client-side
   checks exist for UX, never for integrity.
2. **Play is never gated on security.** A down verifier, a rejected
   submission, or a missing session must not block a run, lose local history,
   or break offline play (D-004, D-016). Anti-cheat degrades to "not ranked",
   never to "cannot play".
3. **Local scores are inviolate.** Sanctions touch the global board only. A
   player's device history is theirs, and the app must never delete it.
4. **Entries are immutable.** No client UPDATE or DELETE policy on any score
   table, ever. Verification status changes only via service role.
5. **Rejected is silent.** A rejected entry stays in the table and vanishes
   from the board without telling its author which check caught it. Detailed
   rejection feedback is free tuning data for the next attempt.
6. **No security through obfuscation.** Minifying or obfuscating the bundle
   buys hours against a determined attacker while costing bundle size,
   debuggability, and stack-trace quality permanently. It is explicitly not
   part of this strategy.
7. **Anti-cheat data is not surveillance.** Action logs are gameplay evidence
   attached to a submission the player chose to make. They stay out of PostHog
   and inherit D-022's exclusions — no email, username, or profile id joined
   to analytics.

---

## Open decisions for the owner

Per WORKFLOW, these are `[DECIDE]` items. No one should code past them.

- **[DECIDE] Do casual runs get a global board at all?** The recommendation is
  no — personal best and friends only. Keeping a global casual board means
  publishing numbers we know are unverifiable.
- **[DECIDE] Does the ranked board wait for the verifier, or launch with
  plausibility checks and backfill verification?** Recommendation: launch on
  plausibility (items 2–3, hours of work), backfill replay before any
  marketing push points at the board.
- **[DECIDE] Sanction ladder.** How far up does an account go — silent
  exclusion only, or eventual account termination? Recommendation in
  [ANTI-CHEAT.md](ANTI-CHEAT.md#sanctions).
- **[DECIDE] Display-name moderation posture** — blocklist at write time, or
  report-and-review after? Recommendation: blocklist now (cheap), reporting
  when the board gets real traffic.
