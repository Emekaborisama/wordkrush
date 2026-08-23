# Reddits

**Last updated:** 2026-08-23
**Status:** Drafts and assets. Nothing posted until the owner names a sub.
**Parent:** [../README.md](../README.md)

This folder is the Reddit lane — copy, the post ledger, and the pictures a
shared link should show. Strategy stays in the files above this directory.

| File | What it is |
|---|---|
| [POSTS.md](POSTS.md) | Draft titles and bodies per sub |
| [ledger.json](ledger.json) | What has been drafted or posted. Do not reuse. |
| [assets/](assets/README.md) | Link-preview card and hero still |

Skill that posts: `.cursor/skills/reddit-ad-posts/` (browser, logged-in tab).
It reads this ledger and will not submit until you write `post r/<sub>`.

## Rooms

Core: r/WordGames, r/webgames, r/playmygame. r/incremental_games only if the
post can be honest about cascades / refill / Monday — otherwise skip.

Also worth a look when rules allow a play-link: r/puzzles, r/browsergames,
r/IndieGaming (often a showcase thread only).

## Link card

Pasting https://wordkrush.com should show [assets/og-share.png](assets/og-share.png)
(1200×630). That file is what `scripts/patch-web-head.mjs` ships as `/og.png`.
Use [assets/hero.png](assets/hero.png) when a post wants a bigger still.
