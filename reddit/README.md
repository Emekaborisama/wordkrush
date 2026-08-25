# More or Less — on Reddit

A [Devvit](https://developers.reddit.com) app that runs **More or Less** inside a
Reddit post. No link-out, no install, no app store. One post a day; everyone on
that post plays the same questions; the streak lands on the day's board and the
result is a spoiler-free block for the comments.

This is a **distribution experiment**, not a migration of the hub. See
[STACK D-042](../docs/STACK.md) for the decision and its stated costs.

---

## Why this exists

[GTM.md §1](../docs/GTM.md) diagnoses WordKrush as "a content engine and no
distribution loop", and lists four Phase-0 blockers. Devvit does not solve them
so much as make them irrelevant:

| The blocker | On Devvit |
|---|---|
| No share mechanic | The post *is* the share. Playing produces a comment; comments rank the post. |
| Blank link previews | Nothing links out. |
| No SEO surface (one ~3 MB bundle) | Reddit threads rank on their own. |
| iOS blocked on the $99 Apple fee | It runs inside the Reddit app on every phone. |

**More or Less rather than Clueless**, deliberately: a daily word puzzle has a
spoiler problem — the comments fill with the answer and poison the post for
everyone who scrolls past later. More or Less has no single answer to spoil, it
is one tap with no learning curve, and every result is a disagreement people
want to argue about.

---

## What is shared, and what is not

The engine is **not** reimplemented here. `src/shared/` imports
`src/games/more-or-less/engine.ts` and the category snapshot straight out of the
Expo tree, so a fairness or difficulty change made there lands on Reddit without
anyone remembering to port it.

```
reddit/src/shared/     pure; imports the Expo engine + snapshot
reddit/src/server/     Hono on Devvit's runtime; owns the run and the board
reddit/src/client/     two DOM bundles; renders what the server says
```

Three mechanisms hold that boundary together:

- **`devvit.json` → `additionalSourceRoots`** puts the parent files into the
  bundle that ships to Reddit's app review.
- **`tools/tsconfig.shared.json`** names every crossing file explicitly. That
  list *is* the contract: a new import in the engine fails the build with
  TS6307 rather than quietly dragging Clueless and Wordfall into a Reddit
  bundle.
- **The root `vitest.config.ts`** runs `reddit/src/shared/**/*.test.ts`, so
  `npm run check` in the repo root still answers "did I break More or Less?" for
  both surfaces.

What does **not** come along: Supabase auth, the global leaderboard, the daily
cross-game streak, PostHog, Expo, React Native, and Lottie. Reddit identity and
Devvit's Redis replace the first two; the rest have no counterpart here.

---

## The design that matters: the server owns the run

The client never receives the seed, never receives a hidden value, and is never
asked what it scored. It sends one word per round — `"more"` or `"less"` — and
the server judges it against state the browser has never seen.

```
GET  /api/init      what should be on screen right now
POST /api/guess     judge one answer, return the verdict + the next question
POST /api/restart   replay the day for fun; does not touch the board
```

`docs/security-and-anti-cheat/` records that the Expo global board ranks
whatever number a client sends ([SEC-01]). That problem does not exist here, and
it cost nothing: Devvit puts a server next to the game for free. The build is
checked against this — neither client bundle contains the pool, the values, or
the engine:

```
dist/client/default.js     1.5 KB    (splash — feed view)
dist/client/game.js        6.8 KB    (the run)
dist/server/index.cjs      1.5 MB    (engine + snapshot live here)
```

The reveal beat covers the round trip: the player taps, the verdict and the
following round arrive together, and the next question is already in hand while
they are still reading the number.

**The honest limit.** Only a player's *first completed run* is recorded, because
everyone gets the same sequence and a replay already knows the answers. That
rule is what the board depends on, and it is enforced with the board itself
(`zScore` before `zAdd`) rather than a separate flag.

---

## The daily post

A cron task in `devvit.json` fires at 13:00 UTC and posts the day's challenge.
That is the entire content calendar: the Wikipedia snapshot is refreshed weekly
by the parent repo's pipeline ([D-036](../docs/STACK.md), [D-052](../docs/STACK.md)),
which now enqueues a new labelled set. Each post plays **that week's newest
round** (same names for everyone on the post) and a date-derived seed picks the
sequence — `seedFromDate` in `src/games/rng.ts`. Personal "rounds passed" is
Expo/web only; a Reddit post cannot wait for each reader to exhaust a set.

`createDailyPost` is idempotent per calendar day, so the cron task, the
moderator menu item and the install trigger cannot split a community's board
across two posts.

The opening matchup is written onto the post as `postData` at creation, which is
why the feed view costs zero network calls.

---

## Commands

Run these from `reddit/`.

```bash
npm install
npm run login        # devvit login — one-time, opens a browser
npm run dev          # devvit playtest against a test subreddit
npm run build        # vite build → dist/client + dist/server
npm run test:types   # tsc --build across client/server/shared
npm run deploy       # typecheck, then devvit upload
npm run launch       # deploy, then devvit publish (app review)
```

Tests run from the **repo root**, not here:

```bash
cd .. && npm test
```

That covers both `reddit/src/shared/**/*.test.ts` (the pure layer, against the
real engine) and `reddit/src/server/**/*.test.ts` (the routes, against the
in-memory Devvit stand-in in `src/server/testing/devvit-fake.ts`, aliased in by
the root `vitest.config.ts`). Keeping them there means CI does not need this
project's dependency tree, and one command still answers "did I break More or
Less?" for both surfaces.

The stand-in implements only what the routes use, but implements it honestly —
`zRange` really sorts and `zRank` really counts from the bottom, because a fake
that returned plausible-looking values would test nothing.

---

## Before this can go live

- [ ] `npm run login` with the Reddit account that will own the app.
- [ ] Create the test subreddit and run `npm run dev` against it.
- [ ] Decide the launch subreddit. Community rules come first: read them, and
      participate before promoting. A moderator who was asked is a partner; one
      who was not is a removal.
- [ ] `npm run launch` and pass app review.
- [ ] Confirm the cron hour suits the audience — 13:00 UTC is 9am US Eastern.

## Policy notes

Reddit's Responsible Builder Policy requires automated content to disclose that
it is automated. The scheduled post is created by the app account, so the
disclosure appears in the post's `textFallback` and on the splash. Nothing here
sends direct messages, posts on a player's behalf, or writes the same content to
more than one subreddit — the "Copy result" button puts the block on the
player's clipboard and lets *them* decide to comment.

Devvit Developer Funds pays a one-time $500 at 500 daily qualified engagers and
roughly $4,000 at 5,000. Modest, but the current plan is deliberately zero
revenue ([O-5](../docs/STACK.md) is open), so this is the only path on the table
that needs neither ads nor IAP.

[SEC-01]: ../docs/security-and-anti-cheat/THREAT-MODEL.md#sec-01--the-global-leaderboard-accepts-any-number-a-client-sends--critical
