# Launch plan — week of 2026-11-09

**Last updated:** 2026-11-07
**Status:** Active. Launch day is **Tuesday 2026-11-10**. Audience and budget are the owner's decisions (G-007); the rest is a recommendation (G-008 to G-010, `Proposed`).
**Supersedes, in part:** [GTM-STRATEGY.md](GTM-STRATEGY.md) §4 and §6, [CHANNELS.md](CHANNELS.md)'s ranking for this week, and [GROWTH-BLOCKERS.md](GROWTH-BLOCKERS.md)'s "do not launch" gate. Their history stays as written.
**Working copy:** the Claude Doc "WordKrush launch week: GTM review and plan" (https://claude.ai/artifact/Uh442MHdQrjQdaNVBdSeRd) holds the full review, the outreach list and the tick-box calendar. This file is the repo's record of it.

---

## 1. The decision

| | |
|---|---|
| Audience | UK/US word-game players (Semantle, Contexto, Wordle) — owner, 2026-11-07 |
| Budget | Organic only — owner, 2026-11-07 |
| Hook | **Clueless**: "Find the secret word by meaning, not spelling. Every guess is ranked by how close it is." |
| Second daily | Higher or Lower's Today's 10 (same ten pairs for everyone) |
| Weekly hook | Wordfall's Monday level |
| Not in the launch | I Sabi Lagos (different audience), paid ads, Product Hunt, autonomous X, the Devvit app |
| Goal | A measured cohort of roughly 100–500 players and a D7 number we trust; not a spike |

**Conflict to resolve.** `.cursor/skills/reddit-ad-posts/` still says "Lead
Wordfall", "No three games", "No hub" and allows invented player counts. This
plan leads with Clueless and invents nothing (the ledger's own rule: "Invented
player counts in copy are ads, not facts"). The owner decides which holds; until
then, the launch drafts below follow this plan and the skill is unchanged.

## 2. Blockers before Tuesday

| # | Blocker | Owner | Fix |
|---|---|---|---|
| 1 | `https://www.wordkrush.com` returns 404 "Application not found" (Cloudflare proxies to Railway, which has no www domain; the redirect rule never fires) | Owner | Cloudflare Redirect Rule: host `www.wordkrush.com` → 301 `https://wordkrush.com` + path, keep the query; or add the www domain on Railway |
| 2 | Supabase Auth sends 2 emails an hour on the free plan | Owner | Custom SMTP through Resend |
| 3 | Copy and claims the app cannot back | Shipped in 0.19.2 | — |
| 4 | Returning Home hides the games (#82 reverted) | Owner decision | Say why #82 was reverted |
| 5 | All-time board of 5 stale players | Owner decision | Lead Scores with Today's 10 or a weekly board |
| 6 | Search Console sitemap and indexing | Owner | Submit `sitemap.xml`, request indexing for `/` |
| 7 | No launch dashboard | Owner (or an agent once PostHog is connected) | Build §5's funnel |

## 3. Calendar (UTC)

| Day | What |
|---|---|
| Sat 7 – Mon 9 | Blockers 1–7; merge 0.19.2; record a Clueless Level 1 clip and a Wordfall cascade clip on a phone; play Clueless Level 1 and note the guess count; check the Reddit account is aged and has real comment karma; list 30–50 people by name |
| **Tue 10** | 08:00 personal messages; 09:00 the Tuesday player email (automatic); 13:00 r/WordGames (draft 1); reply to every comment |
| Wed 11 | 13:00–14:00 Show HN (draft 2); personal LinkedIn / X posts with the clip |
| Thu 12 | 13:00 r/playmygame (draft 3); submit to AlternativeTo, Playlin, the dles list, Wordles of the World; first five editor emails |
| Fri 13 | Ship one fix from feedback and say so in each thread; 72-hour read |
| Sat 14 – Sun 15 | Answer feedback; post nothing new |
| Mon 16 | Wordfall Monday clip from personal accounts; remaining editor emails |
| Tue 17 | D7 read and the decision in §6; write the results into README.md's correction log |

## 4. Channels and their rules

| Place | Rule that decides it | Use |
|---|---|---|
| r/WordGames | Only "no APK links"; showing your own creations is welcome. The August post from a new account now shows as removed. | Draft 1, from the owner's own aged account |
| Show HN | Must be playable without sign-up | Draft 2 |
| r/playmygame | "Playable Link" in the title, a real description, once per calendar month, reply to feedback | Draft 3 |
| r/puzzles | Self-promotion only in the stickied Promo Weekly post | One comment there |
| r/webgames | Link must go straight to ONE game; collections are removed, then banned | Not until a `/clueless` link exists |
| r/wordle | Results only in daily threads | No |

Drafts 1 and 3 are in [reddits/POSTS.md](reddits/POSTS.md) §6 and in the
ledger as `drafted`; draft 2 (Show HN) is in the Claude Doc. All passed
`.cursor/skills/reddit-ad-posts/scripts/dedupe.mjs` against the ledger.

**Link tags.** Always `utm_medium=social` — `organic` is filed under search
by `src/analytics/attribution.ts`. `utm_source` is `reddit`, `hackernews`,
`whatsapp`, `linkedin` or `slack` (the last four recognised since 0.19.2).
`utm_campaign=launch_<place>`; only its presence is recorded, so the posting
day is what separates two channels.

## 5. Scorecard

Targets are METRICS.md's "OK" band. PostHog counts every player who has not
opted out (default-on since 2026-09-02, commit `a2948be`); Cloudflare counts
arrivals without consent and runs higher because of ad blockers.

| Metric | Target | Source |
|---|---|---|
| Unique visitors per day | — | Cloudflare Analytics |
| `landing_viewed` → `run_started` | ≥ 60% | PostHog |
| `run_completed` ÷ `run_started` | 60–75% | PostHog |
| Distinct games per player | ≥ 1.3 | PostHog `game_selected` |
| `result_shared` ÷ `run_completed` | 5–10% | PostHog |
| D1 return | 25–35% | PostHog retention |
| D7 return | 15–25% | PostHog retention; Supabase for signed-in players |

## 6. Kill/scale rules (decided before the data)

| On 2026-11-17 | Then |
|---|---|
| D7 < 10% | Stop promoting; fix the first session before any week-2 push |
| D7 ≥ 15% and share rate ≥ 5% | Week 2: more directories, editor follow-ups, a Wordfall clip series |
| D7 fine, share rate < 3% | Work on the share card before more reach |
| Games per player ≈ 1.0 | Put Clueless first for new visitors |
| Starts < 60% | Add a direct `/clueless` link; revisit the welcome screen's four choices |

## 7. Open owner decisions

1. Why #82 was reverted.
2. How Scores looks with 5 players.
3. A `/clueless` (and `/today`) deep link, like `/isabilagos`.
4. Analytics consent for UK/EU visitors: default-on since 2026-09-02, while STACK D-022/D-024 still describe opt-in.
5. Whether I Sabi Lagos surfaces show by region.
