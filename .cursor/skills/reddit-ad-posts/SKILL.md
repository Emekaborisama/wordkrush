---
name: reddit-ad-posts
description: >-
  Drafts and posts unique Wordfall Reddit ad copy in the browser. Discovers
  extra subs, reads rules and flairs, blocks reuse of prior titles/bodies/hooks,
  then submits once after the owner names the sub. Use when posting to Reddit,
  writing Reddit ads, r/WordGames, r/webgames, r/playmygame,
  r/incremental_games, or when the user asks to promote WordKrush on Reddit.
---

# Reddit ad posts

Wordfall ads, posted as a person, one sub at a time. **Browser only.** No
Reddit MCP. No Reddit API. No `prefs/apps` keys.

Read [voice.md](voice.md) before writing a word. Read [channels.md](channels.md)
before picking a room. Canonical folder:
[docs/marketing/reddits/](../../../docs/marketing/reddits/README.md) — drafts,
ledger, and the link card. The ledger there is the memory; drafted copy counts
as used.

## Do not post until

The owner writes the exact subreddit to publish, e.g. `post r/webgames`.
Drafting, discovery, and rule checks are free. Submit is not.

Never submit the same draft twice. Submit is not idempotent.

The owner must already be logged in. If you hit a login wall or captcha, stop
and hand the tab back. Do not read `.env`. Do not type a password.

## Loop

Copy this and tick it:

```
- [ ] Confirm a logged-in Reddit tab (www.reddit.com). Stop if not.
- [ ] Load docs/marketing/reddits/ledger.json + this chat's earlier drafts
- [ ] Sync live posts (profile submitted + search wordkrush / Wordfall / titles)
- [ ] Pick rooms (core + Reddit search type=communities)
- [ ] Per room: open rules, about, flair on the submit page, /new
- [ ] Skip if off-topic, cooldown, already posted, or rules block promo
- [ ] Draft one unique post per remaining room
- [ ] node scripts/dedupe.mjs --ledger ../../../docs/marketing/reddits/ledger.json --sub … --title … --body … --hook …
- [ ] Show the pack. Wait.
- [ ] On "post r/X": submit once, then append ledger status=posted
- [ ] First comment = bare play URL. Then reply to humans.
```

Stagger: **one live post per calendar day** unless the owner overrides.

## Dedup (hard)

A post is blocked if it collides with the ledger, this chat, or the Reddit
account in **any** of these:

- same title (normalized)
- same first sentence
- same body
- same hook line
- token Jaccard ≥ 0.28 or 5-word shingle Jaccard ≥ 0.18
- that sub already has a `posted` row newer than 21 days
- search / profile already shows WordKrush or that title there

Run the script from this skill directory:

```bash
node scripts/dedupe.mjs --ledger ../../../docs/marketing/reddits/ledger.json --sub WordGames --title "…" --body "…" --hook "…"
```

Exit 1 → rewrite. Do not loosen the script. After a live post, append a full
entry (`posted`, `postedAt`, `redditId`, `url`, fingerprints, title, body, hook).

When you draft and the owner does not post, still append `status: drafted` so
the next run cannot reuse it.

## Copy (non-negotiable)

From [voice.md](voice.md). Short version:

- Lead **Wordfall**. Trace words. Cascades. Ember / Nova / Beam / Flare.
- No Wordle. No streak. No "three games". No hub. No founder-sorry voice.
- Mechanic is true. Player counts are invented (owner license).
- Each sub gets a different title **and** a rewritten first sentence. Same body
  + new title is a ban.
- Link: `https://wordkrush.com/?utm_source=reddit&utm_medium=social&utm_campaign=<sub-lowercase>`
- First comment after a live post is the bare link. Then reply to humans.
- **Every comment** (replies, thread answers, feedback) ends with an
  aligned Wordfall CTA + that UTM link. Answer the thread first. The CTA
  must be the same argument, not a pasted pitch. No fake player counts
  on Reddit. Space comments: new accounts hit “take a break” after one.

## Browser map

Use **www.reddit.com**. Paths have **no** `r/` prefix in `{sub}`.

| Need | Where |
|---|---|
| Logged in? | Any Reddit page — avatar / username |
| What we already posted | `https://www.reddit.com/user/me/submitted/` |
| Hunt dupes | `https://www.reddit.com/search/?q=wordkrush` plus `WordKrush`, `Wordfall`, each title; add `&restrict_sr=1` inside a sub |
| Find rooms | `https://www.reddit.com/search/?q=browser+word+puzzle&type=sr` |
| Fit | `https://www.reddit.com/r/{sub}/` and `/new/` |
| Rules | `https://www.reddit.com/r/{sub}/about/rules` |
| Publish | `https://www.reddit.com/r/{sub}/submit` — **text** tab, title, body, flair if the page requires it, Post **once** |
| First comment | Thread permalink → comment box → bare URL only |
| Reply | Same thread. Humans only. No DMs. Do not vote. |

If submit fails, say so. Do not invent a post URL.

## After a live post

1. Append `docs/marketing/reddits/ledger.json`.
2. Reply in-thread for the first hour if comments land.
3. Do not cross-post. Do not vote. Do not DM anyone.

## Forbidden

- Posting without the owner naming the sub
- Identical or near-duplicate copy across subs
- Fake mechanics (pin-pull, save-the-king, idle generators)
- Putting invented user counts into product docs, PostHog, or App Store text
- Reddit MCP, Reddit API keys, or `EXPO_PUBLIC_*` for Reddit secrets
- Reading `.env` for a Reddit password
- Training on Reddit data, selling Reddit data, or deanonymizing users
