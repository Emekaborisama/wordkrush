# Incident Response

**Last updated:** 2026-08-22
**Audience:** whoever is holding the pager — today, the owner or an agent working on their behalf.
**Principle:** stop the bleeding, then diagnose. Every containment step below is reversible; none require a client release.

At current scale there is no on-call rotation and no paging. What this document
buys is that the first ten minutes are not spent deciding what to do.

---

## Before anything happens

Three things, none of which take a day:

- **Know which contact Supabase Auth alerts reach**, and that someone reads it.
- **Keep a service-role console path that does not depend on the app** — the
  Supabase SQL editor. Every containment action here runs there.
- **Log security-relevant changes in `docs/CHANGELOG.md`** like any other
  behaviour change. An incident with no written record repeats.

---

## A poisoned leaderboard

*Impossible scores, one player holding every rank, or obvious garbage on the
board. Expect this one first — [SEC-01](THREAT-MODEL.md#sec-01--the-global-leaderboard-accepts-any-number-a-client-sends--critical)
makes it a `curl` away.*

**1 — Contain, immediately.** Mark the offending rows rejected. They stay in the
table for analysis and leave the board at once, because every view filters
`status <> 'rejected'`:

```sql
update global_scores set status = 'rejected'
where game_id = '…' and score > <plausible ceiling>;
```

If the board is broadly poisoned rather than spot-poisoned, reject the whole
window and say so in the app rather than leaving a board up that no one
believes.

**2 — Diagnose.** How did it land? Fabricated number (Tier 0 gap), real run on a
self-chosen seed ([SEC-03](THREAT-MODEL.md#sec-03--the-client-chooses-the-seed-and-the-solver-ships-with-it--high) — not
cheating by any check we have), or flood ([SEC-04](THREAT-MODEL.md#sec-04--no-rate-limiting-on-score-insertion--high))?
The answer names which tier in [ANTI-CHEAT.md](ANTI-CHEAT.md) was missing, and
that is the fix.

**3 — Close the gap in SQL.** Plausibility CHECK, insert quota, or challenge
binding. Backend-only; no release, no app-store wait.

**4 — Tell players once, plainly.** "Scores from <window> were reset because
they could not be verified." Do not detail which check caught it
([README principle 5](README.md#standing-principles)). Silence after a visible
reset costs more trust than the reset does.

**5 — Keep the rows.** The rejected corpus is the training input for
[Tier 2](ANTI-CHEAT.md#tier-2--behavioural-detection).

---

## A secret leaked

*`SUPABASE_SECRET_KEY` in a log, a screenshot, a commit, a PR comment, or a
support thread.*

**Rotate first. Assess second.** A key that has been seen is burned, and the
assessment does not change that.

1. **Rotate in the Supabase dashboard.** This invalidates the old key
   immediately.
2. **Update every holder**: `.env` locally, GitHub Actions secrets. The client
   holds no secret key, so no release is involved — that is the payoff of the
   `EXPO_PUBLIC_` discipline in
   [PLATFORM-SECURITY §3](PLATFORM-SECURITY.md#3-secrets).
3. **Purge from history if committed.** Rotation is the real fix; history
   rewriting is hygiene, and never a substitute.
4. **Audit the exposure window.** Supabase logs, for writes that did not come
   from the pipeline.
5. **Record it** in the changelog and fix whatever printed it.

If the *publishable* key leaks: nothing to do. It is public by design and safe
exactly as far as RLS is correct — which is the argument for
[PLATFORM-SECURITY §1](PLATFORM-SECURITY.md#1-data-access--row-level-security).

---

## Account compromise

*A player reports their account posting scores they did not play, or a
magic-link redirect is being abused.*

1. **Check the allowed-redirect list** in the Supabase dashboard. An
   over-broad entry lets an attacker aim the link at a host they control, and
   the link is the credential.
2. **Revoke sessions** for the affected user.
3. **Reject their disputed entries**; do not sanction the account. It is the
   victim.
4. **Tighten the redirect list** and record the change.

---

## Abusive display name

*Slur or impersonation on the public board ([SEC-06](THREAT-MODEL.md#sec-06--public-display-names-are-unmoderated--medium)).*

Immediate, one statement:

```sql
update players set display_name = 'Player-' || substr(replace(id::text,'-',''),1,4)
where id = '…';
```

The name pattern mirrors the collision handling already in
`0004_unique_username.sql`, so it collides with nothing. Then add the term to
the blocklist ([PLATFORM-SECURITY §5](PLATFORM-SECURITY.md#5-trust--safety)) —
handling one instance without extending the list guarantees the second one.

Repeat offence: exclude from ranked boards. Local play is untouched
([README principle 3](README.md#standing-principles)).

---

## Supabase quota exhausted

*Free-tier limits hit — writes failing, board unreachable.*

Distinguish the two causes, because they have opposite responses:

- **Attack** (flooding, [SEC-04](THREAT-MODEL.md#sec-04--no-rate-limiting-on-score-insertion--high)):
  identify the player, reject their rows, add the insert quota. Contain, then fix.
- **Success** (real traffic): upgrade the tier. This is a good problem, and the
  GTM plan should have predicted it.

Either way **the game keeps working**. D-016 guarantees an unreachable backend
degrades to local play, and the outage must never reach a run in progress or
drop AsyncStorage history. If it does, that is a bug of a higher severity than
the outage.

---

## Web deployment compromise

*Unexpected content on wordkrush.com, or an unrecognised deploy.*

1. **Redeploy from a known-good `master` commit.** Railway builds from source
   (D-020), so the deployed artifact is always reproducible from the repo —
   this is the property that makes recovery a rebuild rather than an
   investigation.
2. **Rotate `RAILWAY_TOKEN`** and audit GitHub Actions run history.
3. **Rotate the publishable key** if you believe the bundle served malicious
   JS — it would have been able to act with any visitor's session.
4. **Ship the CSP** from
   [PLATFORM-SECURITY §4](PLATFORM-SECURITY.md#4-the-web-deployment) if it is
   not already live. It is what bounds this class of incident.

---

## Severity and response time

| Severity | Looks like | Response |
|---|---|---|
| **SEV-1** | Secret leaked · player data exposed · site serving malicious content | Immediately. Rotate first. |
| **SEV-2** | Board visibly poisoned · abusive name on a public board | Same day. Contain in SQL, fix after. |
| **SEV-3** | Suspected bot · isolated forged entry | Days. Reject the entry, feed the corpus. |
| **SEV-4** | Hardening gap with no active exploitation | Backlog with a card. |

Every SEV-1 and SEV-2 gets a changelog line and, if the fix is structural, a
STACK decision. An incident that changes how the system works is a decision,
and decisions are written down here (WORKFLOW).
