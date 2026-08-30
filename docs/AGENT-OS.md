# Agent Operating System — WordKrush

**Last updated:** 2026-08-30
**Status:** Wave 1 catalogued; schedules remain owner-configured.

This is the operating contract for the Grok-bot fleet that runs content authoring, organic X growth, QA, product health, and development work for WordKrush. GitHub Actions stay the deterministic hands for CI, merge, deploy, and scheduled email sends. A bot does not replace those jobs and does not push to master.

---

## The fleet

Every bot in the table is a Cursor Cloud Agent backed by a `.cursor/skills/` playbook. Grok-side schedules are live (Clueless 8:55 daily, Conductor 9:55 weekdays, Wordfall Monday 10:55 London). Repo-side Cursor Automations in the Agents Window remain owner-configured. The skill catalog is the contract; an agent reading the repo cold does not invent a parallel OS.

| Bot name | Skill path | Trigger | Write surface | Stop condition |
|---|---|---|---|---|
| **Clueless** | `.cursor/skills/clueless-daily-path/` | Daily 8:55 (Grok-side live) | `content/clueless-daily` PR | CI-gated merge |
| **Wordfall** | `.cursor/skills/wordfall-weekly-gauntlet/` | Mon 10:55 London (Grok-side live) | `content/wordfall-weekly` PR | CI-gated merge |
| **Conductor** | `.cursor/skills/conductor/` [PLANNED] | Weekdays 9:55 (Grok-side live) | Superthread card (read-only) | 8–12 line report |
| **WordKrush QA** | Human agent [PLANNED] | On demand | Feature branch PR | Test pass + owner review |
| **Product Health** | Human agent [PLANNED] | On demand | Superthread card + ROADMAP | Report to owner |
| **WordKrush Dev** | Human agent [PLANNED] | On demand | Feature branch PR | CI pass + owner review |
| **WordKrush X** | `.claude/skills/wordkrush-x-growth/` [PLANNED: Cursor port] | On demand | Superthread card | Caps + ledger + owner review |

---

## Core operating principles

### 1. Grok judges; Actions execute

Clueless and Wordfall bots open or extend standing content PRs. `merge-labeled-content.yml` merges only those named branches after exact-head CI. Wikipedia rotate and Resend player-email stay cron Actions. Grok never becomes `npm run check`.

**Bots do not:**
- Push directly to `master`
- Bypass CI or merge override controls
- Call EAS, deploy to Railway manually, or submit App Store builds
- Replace deterministic GitHub Actions jobs

### 2. Acquisition in this OS is organic X only

Growth is @WordKrushGame on X (formerly Twitter). The growth marketer uses `~/.wordkrush-social/ledger.json` to track post history, enforce caps, and prevent duplicate posting. No Reddit posting, no DMs, no paid ads. The Devvit app (`reddit/`) and `.cursor/skills/reddit-ad-posts/` stay parked; this OS does not launch, post to, or measure Reddit.

**Out of scope for bots:**
- Reddit content posting or Devvit publishing (G-004, D-042 parked)
- Paid acquisition (G-004 closed)
- Direct player messaging or support replies
- Email campaign creation (player email is a Tuesday Broadcast, D-054)

### 3. Owner-only work stops the bot

When the bot encounters one of these blockers, it writes a Superthread card describing the need and stops instead of improvising:

- Apple Developer account work, Expo login, or EAS operations
- Database migrations or schema changes
- Decisions marked [OPEN] or [DECIDE] in BRAINSTORM.md or ROADMAP.md
- Remote feature flags (D-024 off)
- Wikipedia content PR merge (requires human review, D-052)
- Secret rotation or credential changes
- Production incidents or rollbacks
- Legal, compliance, or ToS interpretation

### 4. Caps and abort beat autonomy

Bots that post to external platforms use hard-coded caps and ledger-based deduplication:
- X growth skill: 5 posts per week max, ledger tracks every post, no duplicate content
- Content PRs: one standing PR per branch, no competing level numbers
- Test runs: agent stops after 3 consecutive failures without escalating

When a bot hits a cap or detects an unsafe state, it logs the reason in a Superthread card and awaits owner decision.

### 5. Conductor does not write src/

The Conductor bot is read-only pulse reporting. Daily reads: Superthread board, CI status, content buffers (`clueless-daily`, `wordfall-weekly` PRs), X ledger (`~/.wordkrush-social/ledger.json`), and PostHog retention floor (7-day opt-in rate). Output is an 8–12 line report card in a Superthread entry. It never writes application code, opens feature PRs, or changes product behavior.

---

## Bot catalog details

### Clueless (daily content)

**Purpose:** Maintain 20 future Daily Vault levels so native and web builds always have a bundled buffer.

**Skill:** `.cursor/skills/clueless-daily-path/SKILL.md`

**Contract:** [docs/CLUELESS-DAILY.md](CLUELESS-DAILY.md)

**Schedule:** Daily, 18:00 GMT+1 (owner-configured Automation)

**Workflow:**
1. Read `src/data/clueless/levels.ts` and `campaign.ts`; confirm next consecutive level.
2. Select one eligible answer not used in any bundled solo or team puzzle.
3. Run cache-backed append: `cd validator && uv run python -m app.clueless.build --append-secret <word>`
4. Add static import and catalog row with reviewed copy; default `hintPolicy: 'none'`.
5. Run `npm run test:validator`, `npm run check`, `npm run build:web`.
6. Open or extend standing `content/clueless-daily` PR, apply `automation:auto-merge`.

**Stop if:**
- Semantic guard rejects candidate (cosine ≥ 0.70 to existing puzzle)
- Buffer already has 20+ future levels
- CI fails on the working tree
- A migration or schema change is pending

**Merge:** GitHub Action after exact-head CI passes.

---

### Wordfall (weekly content)

**Purpose:** Maintain four-week buffer of unique Monday hard levels; each `taskFingerprint` is new.

**Skill:** `.cursor/skills/wordfall-weekly-gauntlet/SKILL.md`

**Contract:** [docs/WORDFALL-WEEKLY.md](WORDFALL-WEEKLY.md)

**Schedule:** Weekly check, Wednesday 09:00 UTC (owner-configured Automation)

**Workflow:**
1. Count rows with `availableFrom > today`. Stop if buffer ≥ 4.
2. Compute missing consecutive Mondays. Design one unique hard task per Monday.
3. Each `taskFingerprint` (puzzle vs race + objective kinds) must differ from all existing and planned rows.
4. Append rows to `src/data/wordfall/levels.ts` with name, description, objectives, `availableFrom`.
5. Add/update pending changelog section and version for the PR.
6. Run `npx vitest run schedule.test.ts engine.test.ts`, `npm run check`, `npm run build:web`, `npm run serve:web`.
7. Playtest the local production export (port 8080): hub, picker, launch 1–11.
8. Open or extend standing `content/wordfall-weekly` PR, apply `automation:auto-merge`.

**Stop if:**
- Buffer is healthy (4+ future Mondays)
- Solver cannot finish seeds 11 / 4242 / 90210
- Local production export playtest fails
- CI fails

**Merge:** GitHub Action after exact-head CI passes.

---

### Conductor (daily pulse)

**Purpose:** 8–12 line daily snapshot of product health; does not write code.

**Skill:** `.cursor/skills/conductor/SKILL.md` [PLANNED]

**Schedule:** Daily, 09:00 UTC (owner-configured Automation)

**Reads:**
- Superthread board: open cards, blocked cards, cards in "Doing" > 5 days
- CI status: latest `master` run, any red checks, pending release PRs
- Content buffers: `clueless-daily` and `wordfall-weekly` standing PRs (open/merged/stale)
- X ledger: `~/.wordkrush-social/ledger.json` post count this week, next scheduled post
- PostHog: D7 retention floor (opted-in players), latest recorded `app_opened` count
- Railway: last deploy timestamp, current live commit SHA

**Writes:** One Superthread card (or updates existing daily card) with 8–12 line summary.

**Stop if:**
- Cannot read Superthread API (auth or network)
- PostHog project token missing or 403
- X ledger file absent (not an error; reports "no ledger")

**Output example:**
```
Daily pulse 2026-08-30

CI: green, master @ abc1234 (deployed 4h ago)
Content: Clueless +1 merged, Wordfall buffer healthy (4 weeks)
X: 2 posts this week, next slot Thu
PostHog: D7 retention 18% (opt-in cohort), 340 opens yesterday
Board: 3 open, 1 blocked (ST-42 needs Apple account), 0 stale

Action: ST-42 remains owner-only blocker.
```

---

### WordKrush QA

**Purpose:** Reproduce reported bugs, write regression tests, verify fixes.

**Skill:** Human agent playbook [PLANNED]

**Trigger:** On demand (Superthread card or owner request)

**Workflow:**
1. Read issue card, reproduce locally via `npm run web` or iOS simulator.
2. If reproducible, add failing test in `src/games/<game>/` or `src/`.
3. Investigate root cause; propose fix or escalate if migration/secret/Apple-gated.
4. Apply fix on feature branch, verify test passes, run `npm run check`.
5. Open PR with test + fix, link to Superthread card.

**Stop if:**
- Issue requires migration, Apple Developer, or production secret
- Cannot reproduce after 3 attempts with different seeds/states
- Fix requires engine redesign (escalate to Development bot)

---

### Product Health

**Purpose:** Analyze PostHog funnels, retention cohorts, session replays; surface insights to owner.

**Skill:** Human agent playbook [PLANNED]

**Trigger:** On demand (owner request)

**Workflow:**
1. Read retention dashboards (D7, D14, D30) and activation funnels (game start → game complete).
2. Identify drop-offs > 30%, cohorts with anomalous behavior.
3. Check for error spikes in opted-in sessions.
4. Write Superthread card with findings + recommended follow-up.

**Stop if:**
- PostHog token missing or project archived
- Insufficient sample size (< 100 users in cohort)
- Finding requires user PII analysis (out of scope per D-022/D-040)

---

### WordKrush Dev

**Purpose:** Implement designed features, follow Superthread acceptance criteria, land PR.

**Skill:** Human agent playbook [PLANNED]

**Trigger:** On demand (Superthread card in "To do")

**Workflow:**
1. Read card: Description, Context, Scope, Acceptance, Verification, Sign-off.
2. Branch from `master` using card's `suggested_branch_name`.
3. Implement feature in `src/games/<game>/` or `src/`, write tests.
4. Update docs per `docs/WORKFLOW.md` impact matrix.
5. Run `npm run check`, `npm run build:web`.
6. Open PR, link card, await owner review.

**Stop if:**
- Card is marked [OPEN] or [DECIDE]
- Requires backend/Supabase migration (owner-only per agents.md)
- Acceptance criteria conflict with BRAINSTORM.md [GIVEN] facts
- CI fails after 2 fix attempts

---

### WordKrush X (organic X)

**Purpose:** Draft and post @WordKrushGame tweets for organic growth; enforce caps and ledger-based deduplication.

**Skill:** `.claude/skills/wordkrush-x-growth/` (Cursor port to `.cursor/skills/wordkrush-x-growth/` [PLANNED])

**Trigger:** On demand (owner request)

**Ledger:** `~/.wordkrush-social/ledger.json` tracks every post: timestamp, content hash, URL.

**Caps:**
- Max 5 posts per rolling 7 days
- No duplicate content (checked via content hash in ledger)
- No posts within 8 hours of last post

**Workflow:**
1. Read ledger, confirm weekly cap not hit and no recent post.
2. Draft tweet from latest changelog, Wordfall drop, or approved content theme.
3. Preview tweet in Superthread card; await owner "ship it" confirmation.
4. Owner posts manually using logged-in browser (bot does not hold X credentials).
5. Record post in ledger with timestamp, content hash, tweet URL.

**Stop if:**
- Weekly cap hit (5 posts)
- Ledger shows duplicate content
- Recent post within last 8 hours
- Owner says "hold" on preview

**Out of scope:**
- Paid ads, Reddit posting, DMs
- Replying to mentions or comments (human-only)
- Scheduling posts (owner decides timing)

---

## Automation schedule summary

| Bot | Frequency | Time | Status |
|---|---|---|---|
| Clueless | Daily | 8:55 | Grok-side live; Agents Window owner-configured |
| Wordfall | Weekly | Mon 10:55 London | Grok-side live; Agents Window owner-configured |
| Conductor | Weekdays | 9:55 | Grok-side live; skill [PLANNED]; Agents Window owner-configured |
| WordKrush QA | On demand | — | [PLANNED] |
| Product Health | On demand | — | [PLANNED] |
| WordKrush Dev | On demand | — | [PLANNED] |
| WordKrush X | On demand | — | [PLANNED] Cursor port of Claude skill; Agents Window owner-configured |

**GitHub Actions (unchanged):**
- CI (`ci.yml`): every push and PR
- Wikipedia rotate (`wikipedia-popularity-weekly.yml`): Mon 09:00 UTC
- Player email (`player-email-weekly.yml`): Tue 09:00 UTC
- Merge labeled content (`merge-labeled-content.yml`): after CI completes

---

## Integration points

### Content merge workflow

Clueless and Wordfall bots land here:

```
Bot writes code → git push to content/<name> → open/update PR → apply automation:auto-merge
  → CI runs on PR head → merge-labeled-content.yml waits for success
  → merge to master (if exact head + no requested changes) → Railway deploy
```

No bot pushes to `master`. No bot calls `gh pr merge`.

### Ledger and caps

Growth marketer reads `~/.wordkrush-social/ledger.json`:

```json
{
  "posts": [
    {
      "timestamp": "2026-08-29T14:23:00Z",
      "contentHash": "sha256:abc123...",
      "url": "https://x.com/WordKrushGame/status/...",
      "theme": "Wordfall Monday drop"
    }
  ]
}
```

Bot refuses a post if:
- `posts` count in last 7 days ≥ 5
- Proposed content hash matches any existing `contentHash`
- Most recent `timestamp` is < 8 hours ago

### Superthread card contract

When a bot writes a Superthread card (Conductor daily report, QA findings, Product health analysis, Development blockers):

- **Title:** concise outcome or status
- **Description:** what happened, what was found, or what is blocked
- **Labels:** `agent-created`, plus `blocked` if escalating to owner
- **Column:** `To do` for new work, `Doing` for active, `Done` never (human moves it)

Bots do not close cards, merge PRs that are not content branches, or change card status from blocked to unblocked.

---

## Honesty and observability

### What is live vs planned

- **[BUILT]**: Clueless skill, Wordfall skill, merge-labeled-content.yml, Wikipedia/email Actions, Claude X skill
- **Grok-side schedules live**: Clueless 8:55 daily, Conductor 9:55 weekdays, Wordfall Monday 10:55 London
- **[PLANNED]**: Conductor skill, WordKrush QA/Product Health/WordKrush Dev playbooks, WordKrush X Cursor port
- **Agents Window**: Repo-side Cursor Automations still owner-configured

Wave 1 lands the catalog and committed skills. Grok-side schedules are live; repo-side Cursor Automations in the Agents Window remain owner-configured.

### How to verify a bot ran

- **Clueless/Wordfall:** check standing PR on `content/<name>` branch, commit author, PR body
- **Conductor:** Superthread card titled "Daily pulse YYYY-MM-DD"
- **X growth:** ledger file updated with new post entry
- **QA/Dev:** PR opened from card's `suggested_branch_name`, linked in card

---

## Security and boundaries

- Bots read `.env.example` for key names; never read or print `.env` values.
- Secrets stay in GitHub Secrets (Actions) or owner's local `.env`; never `EXPO_PUBLIC_*`.
- Bots do not hold X credentials; owner posts manually after preview.
- Supabase operations stay RLS-gated publishable key; bots never use `SUPABASE_SECRET_KEY`.
- No bot performs destructive git operations: no `git push --force`, no branch deletion outside PR merge, no tag manipulation.

---

## Updating this document

When a bot's skill, schedule, or contract changes:
1. Update the relevant row in **The fleet** table.
2. Update **Automation schedule summary** if timing or status changed.
3. Update **Honesty and observability** to reflect [BUILT] vs [PLANNED] reality.
4. Bump **Last updated** date at the top.
5. Keep `docs/HOW-IT-WORKS.md` Journey 10 in sync with this contract.

This document is the source of truth. A bot reading the repo uses this catalog, not invented parallel assumptions.
