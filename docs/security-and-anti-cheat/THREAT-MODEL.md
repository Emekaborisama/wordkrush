# Threat Model

**Last updated:** 2026-08-22
**Method:** asset-first. What is worth attacking, who would attack it, where they touch the system, and what the code does about it today.

---

## 1. What we are protecting

Ranked by what actually hurts if lost.

| Asset | Why it matters | Where it lives |
|---|---|---|
| **Trust in the leaderboard** | The entire competitive product. One visible 999,999,999 and honest players stop caring — permanently. Reputation does not recover on the same schedule as a schema fix. | `global_scores`, `global_leaderboard` |
| **Player identity data** | Email addresses under Supabase Auth. A breach is a legal and trust event, not a gameplay one. | `auth.users` |
| **Account access** | Magic link is the only channel; the link *is* the credential in transit. | Supabase Auth, `src/auth/` |
| **Content integrity** | Wrong pageview data makes the game silently lie to players. Corrupting the factory corrupts every client. | Supabase content tables, `pipeline/` |
| **The secret key** | Full RLS bypass on everything above. | `.env`, GitHub Actions secrets |
| **Availability + cost** | Supabase free tier; unmetered writes are a bill and an outage at once. | Supabase, Railway |
| **The brand in public text** | A slur as a display name sits on a public board attached to a game marketed on cognitive benefit. | `players.display_name` |

Deliberately **not** protected: the game content in the bundle. The
dictionary, puzzle ranks, and category values ship to the device by design
(D-004). Treating them as secret would be theatre.

---

## 2. Who attacks it

| Adversary | Motivation | Capability | Realistic? |
|---|---|---|---|
| **Casual score inflator** | Vanity — wants their name at the top | Browser devtools, copy-paste a `curl` from a forum post | **Certain.** The single most likely attacker, and the cheapest to stop. |
| **Automated solver** | Sport, or farming a board | Can read the bundle, reuse the shipped solver, script a session | **Likely** once the board is worth topping. This is the hard one. |
| **Board flooder / griefer** | Ruin it for everyone | Loop an insert | **Likely.** Trivially cheap today. |
| **Sybil farmer** | Many identities, many entries, or name-squatting | Disposable email domains | **Moderate.** Free accounts make it cheap. |
| **Opportunistic scanner** | Credentials, exposed buckets, known CVEs | Automated internet-wide scanning | **Certain**, but generic — handled by the secrets and dependency posture. |
| **Harassing player** | Abuse another player | A display name and a public board | **Moderate**, and rises with traffic. |
| **Content poisoner** | Corrupt the data factory | Would need repo write or Supabase credentials | **Low.** Weekly refresh opens a PR for human review (D-036). |

The threat that shapes the design is the **automated solver**, because it is
the one that survives every check based on "is this run internally
consistent?" — its run *is* consistent. It is beaten by seed authority and
behavioural analysis, not by validation.

---

## 3. Attack surface

![Attack surface: reading the public web bundle yields the publishable key, and a magic link to any inbox yields a real session JWT. The two combine at PostgREST, where the only guard on inserting a global score is auth.uid() = player_id — identity, never gameplay.](diagrams/attack-surface.svg)

<details>
<summary>Text version</summary>

```
  ATTACKER                    SURFACE                          BACKED BY
     │
     │ reads the web bundle
     ├──────────────────────► dist/ single ~3MB JS             Railway (server/serve.mjs)
     │                        · EXPO_PUBLIC_SUPABASE_URL       ← public by design
     │                        · EXPO_PUBLIC_SUPABASE_PUB_KEY   ← public by design
     │                        · full dictionary + solver       ← public by design (D-004)
     │                        · puzzle ranks, category values
     │
     │ magic link to any inbox
     ├──────────────────────► Supabase Auth (GoTrue)           auth.users
     │                        shouldCreateUser: true on signup
     │
     │ holds a real session JWT
     ├──────────────────────► PostgREST /rest/v1/*             ★ THE CRITICAL SURFACE
     │                        · INSERT global_scores           RLS: auth.uid() = player_id
     │                        · UPSERT players                 RLS: auth.uid() = id
     │                        · SELECT global_scores           RLS: status <> 'rejected'
     │                        · rpc username_taken
     │
     │ tampers with the device
     ├──────────────────────► AsyncStorage (local scores)      no integrity guarantee
     │
     └ scans the deployment
                            ► wordkrush.com response headers   server/serve.mjs
```

</details>

The starred line is where essentially all the risk sits. Everything reachable
there is reachable with a legitimately obtained session token, which costs one
email address.

---

## 4. Findings against the current code

Severity is *product damage*, not CVSS. Each finding names the file that
carries it.

### SEC-01 — The global leaderboard accepts any number a client sends · **Critical**

`global_scores_insert_self` in
[`0003_global_scores.sql`](../../supabase/migrations/0003_global_scores.sql)
checks exactly one thing: `auth.uid() = player_id`. You must be yourself. You
need not have played.

The only bound on the value is the column CHECK, `score >= 0 and score <=
1000000000`. `status` defaults to `'unverified'`, and **no code in this
repository ever changes it** — a `grep` for service-role usage finds only
`pipeline/db.ts` (the content factory). The verifier the schema comment
anticipates does not exist.

`global_leaderboard` then ranks every row `where status <> 'rejected'`, which
is every row that has ever been inserted. `parseGlobalScores`
([global.ts:26](../../src/scores/global.ts#L26)) accepts `unverified` and
renders it, exposing `verified: false` to the UI but still placing it in the
ranking.

**Attack, end to end:** read the publishable key from the bundle → request a
magic link to a disposable inbox → `POST /rest/v1/global_scores` with
`score: 999999999` → be rank 1 in every game. No tooling beyond `curl`.

**Damage:** the board is not a ranking. It is a list of self-reported numbers,
presented to players as a ranking.

---

### SEC-02 — Migration 0003 dropped the replay evidence that 0002 had · **Critical**

`leaderboard_entries` (0002) was designed correctly:

```sql
seed    bigint not null,
guesses text[] not null,
-- plus: array_length(guesses, 1) = streak + 1
```

with the reasoning stated in the migration itself — *"Because the engine is a
pure, seeded reducer, a server can REPLAY the run from these and confirm the
streak is real. Without this a leaderboard is just 'whatever number the client
sent'."*

`global_scores` (0003) is the table the app writes to. It kept `seed` and
dropped `guesses`. The intended replacement, `proof jsonb`, is nullable and
**never written** — [`submitGlobalScore`](../../src/scores/global.ts#L110-L125)
sends `score`, `context_id`, `seed`, `duration_ms`, `client_entry_id`,
`played_at`, and nothing else.

**Why it is Critical and not Medium:** this is not a missing feature, it is a
regression that removed the *only* thing that made verification possible. The
newer, live table is strictly weaker than the older, unused one. Every ranked
row written between now and the fix is permanently unverifiable — there is no
evidence to go back to. The longer this stands, the larger the block of
history that can only be discarded, not checked.

---

### SEC-03 — The client chooses the seed, and the solver ships with it · **High**

`randomSeed()` ([rng.ts:29](../../src/games/rng.ts#L29-L31)) is
`Math.random()` on the client, and the chosen seed is submitted alongside the
score. So an attacker can:

1. Pick any seed.
2. Reconstruct the exact board or pair sequence offline — the reducer is pure
   and the data is bundled.
3. Compute optimal play with no time pressure.
4. Submit a run that **passes replay verification**, because it is real.

Wordfall makes this worse than it needs to be: `createSolver` and `isPlayable`
in [`board.ts`](../../src/games/wordfall/board.ts) exist to certify that a
generated board is solvable, which means **the shipped bundle contains a
word-finding oracle for its own boards**. An attacker does not have to write
the hard part; it is already in the download.

**This is the finding that proves replay verification alone is insufficient.**
It is closed by seed authority (the server issues the seed, and only when the
window opens) plus behavioural detection, not by validation.

---

### SEC-04 — No rate limiting on score insertion · **High**

Uniqueness on `global_scores` is `(player_id, client_entry_id)`, and
`client_entry_id` is generated by the client
([types.ts:7](../../src/scores/types.ts#L7)). A loop that increments it inserts
without limit. One account can write an unbounded number of rows.

Two separate damages: the board fills with one player's entries (the
`global_leaderboard` view takes each player's best, so ranking survives, but
the table and every scan over it do not), and Supabase free-tier quota is
consumed on someone else's schedule. Availability and cost are the same
incident here.

---

### SEC-05 — Seeds are publicly readable, and daily seeds are publicly predictable · **High**

Two halves that compound.

`grant select on global_scores to anon` plus the policy `using (status <>
'rejected')` means anonymous callers read every column of every row — `seed`
and `proof` included. Under today's per-run random seeds the leak is mild.

`seedFromDate` ([rng.ts:34](../../src/games/rng.ts#L34-L41)) is
`(YYYYMMDD * 2654435761) >>> 0` — pure, public, and in the shipped bundle. It
exists for the daily-challenge mode named in ROADMAP and HOW-IT-WORKS Journey 1.

The moment a shared-seed challenge ships on that function, **every future
puzzle is computable today, by anyone, forever.** Not leaked — derived. A
public formula over a public calendar is not a seed, it is an announcement.
Combined with the exposed `seed` column, a shared-seed board built this way
is pre-solved before it opens.

---

### SEC-06 — Public display names are unmoderated · **Medium**

The only constraint on `players.display_name` is
`length(trim(display_name)) between 1 and 24` (0002) plus case-insensitive
uniqueness (0004). `validateUsername` in `src/auth/validation.ts` is
client-side, so it constrains the honest path only.

Any signed-in player can set any 24-character string and have it rendered on a
public board next to a product positioned on cognitive benefit for a broad,
partly young audience. This is the finding most likely to become a screenshot.

---

### SEC-07 — Account creation is free and unlimited · **Medium**

Sign-up is email magic link with `shouldCreateUser: true` (D-037). Disposable
inbox domains make identities free. The unique index from 0004 prevents two
accounts *sharing* a display name; it does nothing about one person holding
fifty accounts.

Enables board stuffing (many accounts, one entry each — which the
per-player-best view does not filter out), display-name squatting, and
amplification of SEC-04. Supabase Auth applies its own default rate limits,
which are a speed bump, not a boundary.

---

### SEC-08 — `leaderboard_top` is a definer view over RLS tables · **Medium**

0003 correctly declares `create or replace view global_leaderboard with
(security_invoker = true)`. 0002's `leaderboard_top` has no such clause, so on
Postgres 15+ it runs with its owner's privileges and does not apply the callers
RLS to `leaderboard_entries` or `players` beneath it.

The view's own `where status <> 'rejected'` limits today's practical exposure,
and Supabase's linter flags this pattern (`security_definer_view`) regardless.
The inconsistency is the real problem: two adjacent views with opposite
semantics is how a future edit to one silently widens the other.

---

### SEC-09 — The web deployment sends no security headers · **Medium**

[`server/serve.mjs`](../../server/serve.mjs) sets `content-type`,
`content-encoding`, `etag`, and `cache-control` — deliberately and well, per
D-020. It sets no `Content-Security-Policy`, `X-Frame-Options` /
`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, or
`Strict-Transport-Security`.

No known injection point exists today, so this is blast-radius reduction rather
than an open hole: it is what keeps a future content or dependency compromise
from reaching the Supabase session token, and what stops the game being framed
on a third-party page. Roughly ten lines in the existing `headers` object.

---

### SEC-10 — Implausible values are accepted · **Low**

`duration_ms >= 0` is the only temporal constraint. A Wordfall level with a
50,000-point score and a 1 ms duration inserts cleanly. `played_at` is a
client-supplied timestamp with no bound against server time, so entries can be
dated to the past or the future.

Low on its own, but these are the cheapest checks in the whole document —
pure SQL, no client release, no verifier — and they stop the laziest forgeries
before any expensive machinery runs.

---

## 5. What is already right

Worth recording so it does not get traded away in a refactor.

- **The secrets boundary is explicit and correct.** `.env.example` states the
  `EXPO_PUBLIC_` inlining rule and warns against renaming the secret key into
  it. `.env` and `.env.*` are gitignored with an `!.env.example` exception.
  Only `pipeline/db.ts` reads the secret key. D-035 makes the test player an
  ordinary confirmed user rather than a service-role stand-in — exactly the
  right call.
- **RLS is on for every runtime table**, with no client UPDATE or DELETE
  policy on either score table. Immutability is enforced by absence, which is
  the strongest way to enforce it.
- **The rejected-but-retained design** (`status = 'rejected'` rows stay for
  abuse analysis and never display) is already in both schemas. The plumbing
  for silent sanctions exists; only the actor that sets the flag is missing.
- **Network responses are parsed as untrusted input.** `parseGlobalScores`
  validates every field and drops malformed rows rather than trusting
  PostgREST. The same discipline is in `parseBoard` for AsyncStorage, which
  even recomputes `bestStreak` from history rather than trusting the stored
  aggregate.
- **Analytics is consent-gated** (D-022, D-024, D-040): opt-in, guests stay
  anonymous, identified person properties are limited to account id / username /
  email, no autocapture or session replay, and a hard event-name allowlist in
  `allowlistedCapture` that drops anything undocumented except `$identify`.
- **The content factory is not a runtime dependency** (D-004, D-007), and the
  weekly refresh opens a PR for human review rather than auto-merging (D-036).
  Content poisoning would need repo write access, not just an API key.
- **Idempotent submission** via `client_entry_id` means a flaky network cannot
  double-post. (It is an idempotency key, not a rate limit — see SEC-04.)

---

## 6. Explicitly out of scope

- **Protecting bundled game content.** Ships to the device by design.
- **Client-side tamper detection or bundle obfuscation.** Rejected on
  cost/benefit — see README principle 6.
- **Local score integrity.** AsyncStorage is the player's own device.
  `parseBoard` validates it for *robustness* (a hand-edited file must not crash
  the app), not for trust. A player inflating their own private best harms
  no one; the global board is where it must not travel.
- **Native platform attestation** (App Attest / Play Integrity). Relevant only
  once native ships, and web would remain unattestable regardless.
- **DDoS.** Railway and Supabase edge concerns, not application design.
