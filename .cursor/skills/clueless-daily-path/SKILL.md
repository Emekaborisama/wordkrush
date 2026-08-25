---
name: clueless-daily-path
description: >-
  Adds exactly one reviewed, non-spoiling future Clueless Daily Vault level to
  the standing review PR. Use for the daily Clueless content run, a Daily Vault
  addition, or a Clue Drop authoring task.
---

# Clueless daily path authoring

Read [docs/CLUELESS-DAILY.md](../../../docs/CLUELESS-DAILY.md) first. The
player-facing path and release contract there take precedence over this loop.

## Non-negotiable boundaries

- Add exactly one **future solo** level. Never edit an existing answer or
  renumber catalog rows.
- Do not reuse an answer from any bundled puzzle. Team-race answers and solo
  answers are one shared exclusion set.
- Do not source, print, or depend on `.env`; the append command is cache-backed
  and must not call a model or embedding service.
- Default Daily Vault content to `hintPolicy: 'none'`. Use `opening` or
  `guess_threshold` only for a deliberate Clue Drop with reviewed copy.
- Never auto-merge, push to `master`, call EAS, deploy, or submit an app-store
  build.

## Author loop

1. Inspect `src/data/clueless/levels.ts`, `src/data/clueless/campaign.ts`,
   `src/data/clueless/index.ts`, and the most recent solo rows. Confirm the
   next level and generated puzzle number are consecutive.
2. Inspect the full bundled answer set before selecting a candidate. Choose a
   concrete, common, eligible word with a theme that does not spoil an existing
   solo or team puzzle.
3. Append exactly one generated puzzle:

   ```bash
   cd validator
   uv run python -m app.clueless.build --append-secret <reviewed-word>
   ```

   Stop if it rejects the candidate for eligibility, exact duplication, or the
   semantic-neighborhood guard. Pick a genuinely different concept; do not
   weaken the guard.
4. Add the generated JSON static import to `src/data/clueless/index.ts` and
   append one `CLUELESS_SOLO_LEVELS` row. Its number, `puzzleNumber`, phase,
   policy, title, and description must be explicit. A hint must be concise,
   thematic, and neither contain the answer nor an obvious inflection.
5. Check the team and solo catalog tests still prove disjoint answer sets.
   Record the candidate’s theme and assistance policy in the PR body so a human
   reviewer can judge spoiler risk.
6. Update the release version and changelog according to `docs/WORKFLOW.md`.
7. Verify before any GitHub write:

   ```bash
   npm run test:validator
   npm run check
   npm run build:web
   ```

## Review PR workflow

Use the standing `content/clueless-daily` review branch and PR if it is already
open. If it is not open, follow the repository’s Superthread branch contract
before creating the first content PR. Do not create competing PRs with the
same next number.

The PR title identifies the added Daily Vault level. Its body includes:

- level and generated puzzle numbers;
- answer theme without revealing the answer;
- assistance policy and whether a hint is shown;
- semantic-guard result and verification commands;
- native-release caveat: the content reaches iOS only in a later installed
  build.

Push only after the local verification loop is green. Request human review and
leave merge control with a person.
