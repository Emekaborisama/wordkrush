# Clueless daily path

Clueless has one solo path, not a difficulty picker. All level content is
bundled with the app so the game remains playable without a network request.

## Player contract

1. **First Spark** opens with a thematic hint.
2. **Follow the Heat** reveals its thematic hint after 15 valid, unique guesses.
3. **No Map** has no hint.
4. From level 4 onward, a solved level schedules exactly one next Daily Vault
   level for the player’s next **local** midnight. An unfinished level never
   schedules another vault.

The app records the legacy `easy`, `standard`, and `expert` score partitions as
assistance contexts. They remain comparable historical score contexts, but are
not choices the player makes.

`src/data/clueless/levels.ts` is the authoritative solo catalog: it assigns a
generated puzzle, level name, phase, hint policy, and reviewed hint copy.
`src/data/clueless/campaign.ts` owns the independent team-race catalog. The
two answer sets must never overlap, so a race cannot spoil a future solo vault.

## Content buffer and release clocks

The checked-in catalog contains the three onboarding levels and 20 future
Daily Vault levels. A daily authoring run adds one future level to keep that
bundled buffer healthy.

An automation run is not a player unlock:

- A player unlocks only after completing their current level and reaching the
  next local midnight.
- A merged content PR reaches web when the web build deploys.
- Native players receive added vaults only after installing a build that
  contains them. Do not promise a new download to an older iOS install.

## Daily authoring contract

The intended Cursor Automation schedule is **18:00 GMT+1**. Its committed
`clueless-daily-path` skill creates or extends the standing review PR on
`content/clueless-daily`; it must never auto-merge, push to `master`, call EAS,
or submit an app-store build. The final schedule must be configured in the
Cursor Automations editor; until then this document and the skill are the
executable review contract, not an active cron.

Every run must:

1. Start from the current catalog and choose one eligible answer absent from
   every bundled puzzle.
2. Run the cache-backed append command:

   ```bash
   cd validator
   uv run python -m app.clueless.build --append-secret <reviewed-word>
   ```

   It ranks using the tracked vocabulary embedding cache. It does not call an
   embedding service, regenerate the vocabulary, or read a runtime key.
3. Add the static import and one solo catalog row with reviewed, spoiler-free
   copy. Daily Vault levels default to `none`; a deliberate Clue Drop may use
   `opening` or `guess_threshold`.
4. Reject an exact answer duplicate, an ineligible answer, and a candidate
   whose cosine similarity to a bundled answer is at least 0.70. The review PR
   must state the intended non-spoiling theme and assistance policy.
5. Update the manifest, changelog, and release version as required by
   `docs/WORKFLOW.md`, then run:

   ```bash
   npm run test:validator
   npm run check
   npm run build:web
   ```

Merge remains a human review decision. If an open standing PR already contains
the next level, update that PR rather than creating a conflicting second level
number.
