# Reddit launch posts

**Status:** Drafts, unposted.
**Read first:** [../CHANNELS.md](../CHANNELS.md) §3 and [README.md](README.md).

Built on the creative structure Royal Match, Candy Crush and Duolingo actually
use — not their voice. The distinction matters and §0 explains why.

---

## 0. What transfers from Royal Match / Candy Crush / Duolingo, and what doesn't

Those three buy **paid placement in a feed where they have no permission**, so
their copy has to win a stranger in one second. Reddit is **earned placement in
a room with moderators**, where brand voice is removed on sight. Paste a Royal
Match line into r/webgames and it gets pulled. So steal the structure, keep a
voice the room accepts.

### Steal these

**1. Failvertising — show the loss, not the win.**
Royal Match, Township and Subway Surfers all lead with a player failing
something easy. The viewer thinks *I could do better* and installs to prove it.
Reported as outperforming tutorial-style creative by ~2.2×. This is the single
biggest transfer available, because a challenge is also the native engine of
every post that has ever done numbers on Reddit. **Every title below is a
challenge the reader wants to disprove.**

**2. The hook is the whole job.**
First 1–3 seconds is the #1 performance factor in mobile UA. On Reddit the
title *is* the hook — it's the only thing 95% of people see. Which is why §5
gives five title variants per community instead of one.

**3. Never explain the mechanic. Drop them into a predicament.**
Royal Match ads do not say "match three tiles." They say the King is about to
drown. Our equivalent: don't say "guesses are ranked by semantic distance."
Say *"ocean is cold, grief is hot, now what's warmer than grief?"*

**4. Make the near-miss visible.**
A near-miss fires nearly as much dopamine as a win and is the most reliable
driver of "one more go." Candy Crush engineers it; we can just *name* it —
"you'll be four points away and burn fifteen guesses getting there."

**5. Duolingo's four voice qualities** — expressive, playful, embracing,
worldly. The operative one is *expressive*: simple words for big feelings, brief,
active voice, direct. Every sentence below is checked against that.

### Do not steal these

- **Fake mechanics.** Royal Match's pull-the-pin ads show a game that does not
  exist in the product. On a feed you get away with it; on Reddit the top
  comment corrects you and the post becomes a thread about you lying. It also
  buys installs that churn — the documented long-term cost is retention and
  brand damage.
- **Celebrity and social proof.** Royal Match has Simon Cowell. We have nothing
  to put there yet, and faking scale is the tell that gets a post killed.
- **Third-person brand voice.** All three write as a brand. Here you write as a
  person who built a thing, or you get removed.

### The skeleton every post below uses

```
HOOK    one specific claim the reader wants to disprove   ← the title
STAKE   what it costs when they're wrong
PROOF   one real, concrete number
ASK     one verb
```

---

## 1. r/WordGames — Clueless

**Title**

> "Ocean" is cold. "Grief" is hot. What's warmer than grief?

**Body**

> That's the entire game. One secret word a day. Every guess comes back with one
> number — how close it is in **meaning**.
>
> Not letters. Meaning. Your guess can share zero letters with the answer and
> come back burning.
>
> The part that gets people: you'll be four points away and burn fifteen guesses
> circling it. You can feel the shape of the word and still not have it. Then it
> lands, and it's obvious, and you're annoyed it took you that long.
>
> Free, browser, no signup, no download: **wordkrush.com** → Clueless
>
> Post your guess count. I want to see someone beat mine.

*"Post your guess count" is doing real work — comment volume is what Reddit's
ranking rewards, and a number is the lowest-effort comment a lurker can leave.*

---

## 2. r/webgames — More or Less

This sub strips marketing voice, so the surprising fact does the selling and the
sentences stay flat. The challenge lives entirely in the title.

**Title**

> Cats or dogs — which gets more Wikipedia traffic? Most people get this one wrong.

**Body**

> Two things side by side. Pick the one with more monthly Wikipedia pageviews.
> One wrong pick ends the run.
>
> Real numbers, straight from the Wikimedia pageviews API, refreshed weekly so
> it doesn't rot into old trivia.
>
> Where people break:
> - Cats beat dogs by nearly 2×.
> - TikTok beats Albert Einstein — by about six hundred views.
> - Michael Jackson beats YouTube.
>
> My best run is **[FILL IN — your real number]**. Nobody I've handed it to has
> beaten it yet.
>
> Free, no account, no download, no ads: **wordkrush.com** → More or Less

---

## 3. r/playmygame — Wordfall

Template is enforced and flair is required. Fill every field; a missing one is a
removal. The Description field is where the structure from §0 goes.

**Title**

> You spell one word. The board spells the next four without you.

**Body**

> **Game Title:** WordKrush
>
> **Playable Link:** https://wordkrush.com (open Wordfall from the hub)
>
> **Platform:** Web — desktop and mobile browser. No download, no account.
>
> **Description:** You trace a word across the grid and those tiles clear.
> Everything above them falls — and the fall spells words you never planned,
> which clear, which drops more letters. A trace you thought was worth 40 points
> finishes at 900 because the board kept playing after you stopped.
>
> Then you hit a level with six moves and a board that refuses to cascade, and
> you find out the game was never about the words you can spell. It's about what
> lands after they're gone.
>
> Levels come in two shapes, never both: a puzzle gives you fixed moves and no
> clock; a race gives you a clock and effectively unlimited moves. New level
> every Monday.
>
> **Free to Play:** Yes. No ads, no purchases, no account needed to play.
>
> **Involvement:** Solo developer — designed and built all of it.
>
> **What I want feedback on:** the difficulty curve. I genuinely can't tell any
> more whether levels 6–9 are a wall or a warm-up — I've played them two hundred
> times each.

*Set flair before submitting.*

---

## 4. r/incremental_games — weak fit, post honestly or skip

**This is not an incremental game.** No idle accrual, no prestige, no
exponential curve. That sub's regulars clock it in one screenshot, and a post
that pretends otherwise is treated as spam. The one survivable version admits it
in the first line — that community forgives an honest mismatch and punishes a
disguised one.

Note the failvertising move still works here, because "a 40-point word finished
at 900" *is* the number-go-up hook.

**Title**

> A word worth 40 points finished at 900 because the board kept playing without me. Not an incremental — but I need your eyes on the multiplier curve.

**Body**

> Straight up: this is a word puzzle, not an incremental. No idle, no prestige.
> I'm here because the scoring loop is the part I built for this crowd and I've
> stopped being able to see it.
>
> You trace a word. Those tiles clear, everything above falls, and the fall
> spells new words on its own — which clears more, which drops more. Every link
> in the chain multiplies.
>
> The actual question: the multiplier is linear in chain depth right now, and
> deep chains feel under-rewarded relative to how hard they are to engineer.
> Anyone who has tuned a chain-multiplier curve — where would you put it?
>
> Free, browser, no account: **wordkrush.com** → Wordfall

---

## 5. Title variants — write twelve, keep two

No UA team ships one creative. They ship a batch, kill the losers, and scale the
survivor. The title is our creative. Same title never goes in two subs.

**Clueless**
1. "Ocean" is cold. "Grief" is hot. What's warmer than grief?
2. Your guess can share zero letters with the answer and still be the hottest thing on the board.
3. One word a day, no letter hints, and the last four points are the worst part.
4. I built a word game that makes spelling completely worthless.
5. Everyone gets within four points and then burns fifteen guesses.

**More or Less**
1. Cats or dogs — which gets more Wikipedia traffic? Most people get this one wrong.
2. Michael Jackson gets more Wikipedia views than YouTube. That's the whole game.
3. TikTok beats Albert Einstein by six hundred views a month. Pick which one wins.
4. Guess which Wikipedia article is more popular. One wrong answer ends the run.
5. Real Wikipedia pageview data, refreshed weekly, and I still can't get past [N].

**Wordfall**
1. You spell one word. The board spells the next four without you.
2. A 40-point word finished at 900 because the board kept playing after I stopped.
3. Six moves, one grid, and the words you *can't* see are the ones that score.
4. New level every Monday. This week's is a race and I've never beaten it clean.
5. Trace a word, watch it collapse half the board.

---

## Before any of these go out

- **Fill in every [N].** Two drafts have a bracketed placeholder for your real
  best score. Put your actual number in or cut the sentence. A made-up stat is
  the one thing on this page that can't be recovered from in a comment section.
- **Link card.** [`scripts/patch-web-head.mjs`](../../../scripts/patch-web-head.mjs)
  copies [assets/og-share.png](assets/og-share.png) into `dist/og.png` and
  injects `og:` / `twitter:` tags. After deploy, re-scrape the URL — Facebook
  and Reddit cache blank cards. See [GROWTH-BLOCKERS.md](../GROWTH-BLOCKERS.md#2-no-link-preview).
- **There are no per-game URLs.** `web.output: "single"` with state-driven
  screens means wordkrush.com is the only address, so every post has to say
  "open X from the hub." r/webgames' rule is *link directly to the game*, so
  that's the sub most likely to bounce it.
- **The pageview numbers refresh weekly.** Re-check the three pairs in §2
  against [`src/data/categories/wikipedia-popularity.json`](../../../src/data/categories/wikipedia-popularity.json)
  the morning you post. A wrong number in a title becomes the whole thread.
- Stagger by days. Reply to everything inside 24h. Ship one visible fix from the
  feedback and say so.
