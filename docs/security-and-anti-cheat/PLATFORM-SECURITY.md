# Platform Security

**Last updated:** 2026-08-30
**Covers:** everything that is not leaderboard integrity — data access, accounts, secrets, the web deployment, trust & safety, and supply chain. Leaderboard integrity is [ANTI-CHEAT.md](ANTI-CHEAT.md).

---

## 1. Data access — Row Level Security

RLS is the entire boundary. The publishable key is in the web bundle by
design, so **every access rule is a policy or it does not exist**. There is no
application server in front of PostgREST to add one later.

### The standing rules

1. **RLS on before the first row.** A runtime table without RLS is a public
   read/write endpoint.
2. **Score rows are immutable.** No client UPDATE or DELETE policy on
   `global_scores` or `leaderboard_entries`, ever. Enforced by absence, which
   cannot be misconfigured.
3. **`status` is service-role only.** It is the verifier's output. A client
   that can write it can verify itself.
4. **Views over RLS tables declare `security_invoker = true`.** 0003 does;
   0002's `leaderboard_top` does not (SEC-08). Bring it in line — two adjacent
   views with opposite semantics is how a later edit to one silently widens
   the other.
5. **Grant columns, not tables, where the row holds evidence.** `grant select
   on global_scores to anon` currently exposes `seed` and `proof` to anonymous
   callers (SEC-05). The public board needs neither. Read the leaderboard
   through the view; keep evidence columns off the anonymous grant.
6. **Every migration states its threat reasoning in a comment.** 0002 and 0003
   both do this well and it is why their gaps were findable. Keep it up.

### Verification

Supabase's database linter catches `security_definer_view` and missing-RLS
directly. Run it after every migration; it would have flagged SEC-08 on the day
0002 landed. Pair it with a written check that the new table has no client
write policy it does not need.

---

## 2. Accounts and Sybil resistance

Email magic link is the only sign-in channel (D-037), which is a good posture:
no passwords to leak, reuse, or reset. The residual risks are about *how many*
identities one person can hold, not how strong one is.

**Current state.** `shouldCreateUser: true` on sign-up, disposable inboxes are
free, and the 0004 unique index stops two accounts sharing a display name but
not one person holding fifty (SEC-07). Supabase Auth's default rate limits are
a speed bump.

**Proportionate response**, in order:

1. **One ranked entry per challenge** ([ANTI-CHEAT 0.2](ANTI-CHEAT.md#tier-0--structural))
   removes most of the *value* of extra accounts — the cheapest fix, and it is
   already on the anti-cheat path.
2. **Block known disposable-email domains at sign-up.** A list, refreshed
   occasionally. Imperfect and worth it: it converts "free" into "mildly
   annoying", which is where most farming stops.
3. **Age a new account before it can rank.** A first ranked submission
   requires an account older than one window. Costs an honest player one day
   once; costs a farmer a day per identity, permanently.

**Not proposed:** phone or ID verification. It contradicts the optional-account
design (D-016, "signing in is an enhancement, never a gate on playing"), and it
collects far more sensitive data than a casual game should hold.

**Magic-link hygiene** — already correct, keep it that way: absolute
`emailRedirectTo` (`src/auth/redirect-url.ts`), the Supabase dashboard's
allowed-redirect list kept tight, and PKCE code exchange on native
(`completeSessionFromUrl`). The link *is* the credential in transit, so any
redirect target we allow is a target an attacker may aim it at. Adding an
origin to that list is a security decision.

---

## 3. Secrets

**This is the part of the codebase that is already right.** Recorded so it is
not traded away in a refactor.

| Secret | Where it lives | Rule |
|---|---|---|
| `SUPABASE_SECRET_KEY` | `.env` (gitignored), GitHub Actions secrets | Full RLS bypass. Server and pipeline only. **Never** `EXPO_PUBLIC_`. Only `pipeline/db.ts` reads it. |
| `RESEND_API_KEY` | `.env` (gitignored), GitHub Environment `best-games` | Sends Broadcasts to every signed-in player. Pipeline and the Tuesday workflow only (`environment: best-games`). **Never** `EXPO_PUBLIC_` or Railway. |
| `SUPABASE_PUBLISHABLE_KEY` | Bundle | Public by design. Safe only because RLS is correct. |
| `EXPO_PUBLIC_POSTHOG_KEY` | Bundle | Public by design (D-024). |
| `TEST_PLAYER_*` | `.env` | An ordinary confirmed user, not a service-role stand-in (D-035). Real credentials — never printed, committed, or shipped. |
| `OPENAI_API_KEY` | `.env` | Offline validator only. Never called at game runtime (D-010). |
| `OPENROUTER_API_KEY` | `.env`, GitHub Environment `best-games` | Tuesday player-email draft (`pipeline/player-email.ts`). Never called at game runtime (D-062). |
| `RAILWAY_TOKEN` | GitHub Actions secrets | Deploy only (D-020). |
| `CONTENT_AUTOMERGE_TOKEN` | GitHub Actions secrets | Fine-grained PAT or GitHub App token used only by `merge-labeled-content.yml`. It needs Actions read plus Contents and Pull requests write so its merge event starts the normal master CI/deploy/release workflows. Never `.env`, Railway, or `EXPO_PUBLIC_*` (D-059). |

The load-bearing detail is the naming rule, stated in `.env.example` itself:
**only `EXPO_PUBLIC_*` variables are inlined into the bundle, which is exactly
why the secret key must never carry that prefix.** One rename is the whole
breach. That comment is doing real work — leave it in.

**Rotation.** Any secret that appears in a log, a screenshot, a PR, or a
support thread is burned and gets rotated, not assessed. See
[INCIDENT-RESPONSE.md](INCIDENT-RESPONSE.md#a-secret-leaked).

---

## 4. The web deployment

`server/serve.mjs` is ~150 hand-written lines (D-020) with deliberate,
well-reasoned caching. It sends no security headers (SEC-09).

**Proposed** — added to the existing `headers` object, roughly ten lines:

| Header | Value | Why |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; connect-src 'self' <supabase> <posthog>; img-src 'self' data: <wikimedia>; media-src 'self' https://lottie.host; frame-ancestors 'none'` | Blast-radius reduction. If content or a dependency is ever compromised, this is what keeps it from reaching the Supabase session token. |
| `X-Content-Type-Options` | `nosniff` | Stops MIME confusion on the static bundle. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Keeps auth-callback URLs out of third-party referer logs. |
| `Strict-Transport-Security` | `max-age=31536000` | Railway already terminates TLS; this pins it. |

CSP needs the real allowlist assembled from what the app actually calls:
Supabase, PostHog (`EXPO_PUBLIC_POSTHOG_HOST`), Wikimedia image hosts, and
`lottie.host` (D-032). Get it wrong and the app breaks loudly in the browser
console, which is the good failure mode — verify with `npm run build:web` then
`npm run serve:web` before deploying, per the D-038 gate.

`frame-ancestors 'none'` also stops the game being embedded on a third-party
page and monetised by someone else, which is a business concern as much as a
security one.

---

## 5. Trust & safety

`players.display_name` is public text next to a public score, constrained only
by length and uniqueness (SEC-06). Client-side `validateUsername` constrains
the honest path only.

**Proposed**, in order of cost:

1. **Server-side blocklist at write time.** A Postgres CHECK or trigger over a
   slur list, plus normalisation that defeats the obvious evasions
   (leetspeak, inserted separators). `username_key()` in 0004 already
   establishes the normalise-then-compare pattern to extend.
2. **Reserved names.** `admin`, `moderator`, `wordkrush`, `official` and
   similar, so no one impersonates the product on its own board.
3. **Report + review**, once the board carries real traffic. A reported name is
   hidden from the board pending review, not deleted — the same
   silent-containment posture as [ANTI-CHEAT Tier 3](ANTI-CHEAT.md#tier-3--containment).

Do this **before** the board is promoted, not after. A public leaderboard is a
publishing surface, and the first offensive name will arrive attached to a
screenshot. The product is positioned on cognitive benefit for a broad,
partly young audience, which raises both the likelihood of harm and the cost
of it.

> **[DECIDE]** Blocklist now and reporting later, or both together?
> Recommendation: blocklist now — it is a few hours and covers the common case.

---

## 6. Privacy

D-040 identifies opted-in signed-in players in PostHog. Guests stay anonymous.
The event-name allowlist still drops autocapture, session replay, and guessed
content. Person properties are limited to account id, username, and email.

Two obligations this strategy adds:

- **Anti-cheat evidence stays out of analytics.** Action logs are gameplay
  evidence attached to a submission the player chose to make. They live in
  `global_scores.proof` and inherit D-022's exclusions. They are never sent to
  PostHog and never joined to a person profile.
- **Deletion has to reach both.** Account deletion cascades in the schema
  (`references auth.users(id) on delete cascade`), which covers `players`,
  `global_scores`, and `proof` with it. After D-040, PostHog holds the same
  user id plus username and email, so a deletion request must also delete the
  matching PostHog person. There is no in-app deletion path yet; the privacy
  policy must state both destinations.

A published privacy policy is required before App Store submission regardless.

---

## 7. Supply chain

`package.json` is admirably small, and agents.md's "avoid new dependencies by
default; justify any addition in STACK.md" is the strongest supply-chain
control available to a project this size. Every dependency added is permanent
attack surface in a bundle that carries a Supabase session token.

Practices to add:

- **Dependabot or `npm audit` in CI**, advisory-only at first so it informs
  rather than blocks (consistent with D-029 keeping lint and bundle budgets out
  of the merge gate).
- **`package-lock.json` is committed** — already true. Keep CI on `npm ci`.
- **Treat the Lottie CDN as untrusted** (D-032). It is chrome with a bundled
  fallback and must never become a path for executable content; the CSP
  `media-src` entry is what enforces that.
- **The content pipeline is the other supply chain.** Wikimedia data reaches
  players through a human-reviewed PR (D-036) with a >10x swing report and a
  fail-closed floor. That is the right shape — keep merge human.

---

## 8. Native, when it ships

Not yet relevant (iOS is blocked on the Apple Developer Program), recorded so
it is not rediscovered later:

- **Session tokens go in the Keychain / Keystore**, not AsyncStorage. Check
  what the Supabase RN client does by default before submission.
- **App Attest / Play Integrity** can raise the cost of automated play on
  native. Web stays unattestable, so it cannot become the basis of ranking
  eligibility without splitting the board by platform — which is worse than
  the problem.
- **Certificate pinning is not proposed.** High operational risk (a rotation
  bricks installed apps), low benefit given RLS already assumes a hostile
  client.
- **A published privacy policy and correct data-collection disclosures** are
  submission blockers. Section 6 is the input.
