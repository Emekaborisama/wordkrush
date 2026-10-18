# Design System — WordKrush

**Last updated:** 2026-10-18 (Block Blast rebuild, ST-112)

This is the source of truth for visual and interaction decisions across the
hub and every game. Read it before adding a screen or component. It exists so
"redesign the app" turns into "extend one system" instead of "restyle seven
screens by hand."

Product name, logo use, and brand colour live in
[`docs/branding/`](branding/README.md). The lockup PNGs are unchanged and still
paint favicons, share cards and email; inside the app the logo is the block
logo described below.

## Owner decision (2026-10-18): follow the Block Blast kit

The owner judged the sand / wood / glossy-pill chrome shipped earlier the same
day (0.9.0, ST-106–ST-110) "scattered and poor" and asked for the whole flow to
be rebuilt to follow one reference **exactly** — "not to be inspired but to
follow the exact approach":

- **Primary: Block Blast UI** by Room 8 Studio —
  <https://www.behance.net/gallery/71443535/Block-Blast-UI>. UX research
  (wireframes), style research, pop-up research (Version 1 → Version 2 →
  Final), main colours, typography, UI kit, promo materials.
- **Secondary: Block King** by Questar Studio —
  <https://www.behance.net/gallery/255728937/Block-King-Mobile-Game-Design-Development>.
  Used for game *juice* only: golden `+100` / `+400` score bursts with a glow,
  the "NEW RECORD!" ribbon over a trophy, the reacting mascot in a gold frame.

The sand / wood chrome is superseded. Where this file and an older decision
disagree, this file wins.

### What we took from the kit, one line each

| Kit element | In WordKrush |
|---|---|
| Main colours `f15d70` `6bb9e0` `ffe1be` `62ac25` `2dadbd` | `kit` / `palette` in `src/ui/theme.ts`, names unchanged |
| Neuron Black (headline) / Neuron Bold (description) | **Exo 2** Black / Bold — the closest free squarish face (`font.black`, `font.body`) |
| Blue sky, sun rays, cumulus along the bottom | `SkyBackground variant="sky"` behind every menu screen |
| Lighter cyan sky behind the board | `SkyBackground variant="play"` behind gameplay |
| Final pop-up: coral body, white rim, keyline, gloss dot, teal title tab, red close disc | `Panel` / `PopupModal` + `RibbonTitle` + `CloseButton` |
| Cream inner box (Music / SFX, Goal) | `CreamBox` + `CreamText` |
| Glossy rounded-rectangle buttons (Connect, Terms, Contact us, Play) | `Button` tones `blue` `green` `gold` (+ `red` `purple` `teal` `coral` `sky`) |
| Music / SFX switch | `Toggle` |
| Top bar: lives pill, logo, coins pill | `TopBar`: streak pill, block logo, coin pill (`ResourcePill`) |
| HUD: cream panels with red tabs (Moves / Goal / Score), star bar | `HudPanel` + `StarBar` |
| Board of studded LEGO-like cubes in a cyan frame | `BlockTile` (cream letter tiles, coloured specials) in the board frame |
| Green booster squares + gold gear | `SquareButton` (`tone="green"`, `price`) + gold circle gear, in a `BoosterDock` |
| Star ribbon, level complete ("LEVEL 999 / LEVEL COMPLETED / 1000 pts / Continue") | `StarRibbon` + result `PopupModal` |
| "More Lives?" red banner | `RibbonTitle kind="banner"` |
| Level list with pixel-block numbers and stars | `BlockDigits` + level rows in the Levels popup |
| BLOCK (cubes) BLAST! (gold) logo | `BlockLogo`: WORD (cubes) KRUSH! (gold) |
| Icon row (clock, star, heart, coin, gear, TV, gift, trophy, bomb) | `GameIcon` (art icons) + glyph icons for buttons |
| Block King `+400` bursts, NEW RECORD! | `ScoreBurst`, `ComboBanner`, red banner over trophy |

## Tokens (`src/ui/theme.ts`)

```
kit       the five main colours, exactly as the kit names them
palette   kit + sampled ends: coralTop/coralBottom/coralEdge, creamFill/creamEdge/creamShade,
          navy/navyDeep, skyTop/skyMid/skyBottom/cloudShade, playTop/playBottom,
          frame/frameDeep/well/tray/dock, ink/inkSoft/tealInk, red/redDeep,
          gold/goldDeep/goldEdge, orange, blue, purple, pink, lime
cube      cube colours: red orange yellow green teal blue purple pink cream stone gold
tone      glossy faces {top, bottom, lip, outline}: green blue gold red purple teal coral sky grey
font      black (Exo2_900Black) heavy (800) body (700) — legacy names medium/semibold/bold map onto them
type      hero displayXL display title subtitle body bodyStrong caption overline — no fontWeight
```

Rules that keep it one system:

- **Never set `fontWeight`** next to a `font.*` family. Each weight is its own
  family; on web a `fontWeight` above 400 makes the browser fake a heavier face
  on top of an already heavy one (that was the smeared look of the old build).
- **Text on colour is white and outlined** (`StrokeText`, `PanelText`, button
  labels). The outline is the tone's darkest shade and clears 4.5:1 against the
  white glyph (asserted in `theme.test.ts`).
- **Long copy lives in a `CreamBox`** in navy (`CreamText`); never paragraphs of
  white text on coral or sky.
- **No new colours in screens.** If a screen needs one, it goes in `palette` /
  `tone` / `cube` with the kit element it came from.
- Gradients are `Gradient` (react-native-svg) inside a parent with
  `borderRadius` + `overflow: 'hidden'`. Shadows go on a view that has a
  `borderRadius` and a background — a shadow on a transparent wrapper draws a
  square box on web (the old build's grey rectangles behind pills).
- The legacy names (`palette.sand/wood/paper/brown/...`, `pill`, `pillChrome`,
  `elevation('wood')`) are deprecated aliases kept only so un-migrated code
  compiles; they map onto Block Blast values. Do not use them in new code.

## Component library (`src/ui/components/`)

| Component | Kit element | Notes |
|---|---|---|
| `StrokeText` | All outlined lettering | Ring of copies + thick foot. `size stroke strokeWidth depth color` |
| `Gradient`, `useSvgId` | Every glossy face | Absolute-fill SVG linear gradient |
| `GlossFace` | Button body | Gradient face, shine band, gloss dot, lip, outline; sinks on press |
| `Button` | Connect / Terms / Contact us / Play | `tone`, `size` xl/lg/md/sm, `leading` icon, `disabled` → grey |
| `SquareButton` | Booster squares, home buttons, gold gear | `shape` square/circle, `price` chip, `badge`, `caption` |
| `RoundIconButton` | — | Legacy API over `SquareButton shape="circle"` |
| `Panel` | Final pop-up | `title` + `ribbon` (tab/banner/scroll), `onClose`, `tone` coral/purple/sky, `scroll`, `footer` |
| `PopupModal` | Pop-ups over the game | `Panel` over a navy scrim, pops in with overshoot |
| `PanelText`, `PanelDivider`, `CreamText` | Copy on coral / divider / copy in cream | |
| `RibbonTitle` | Teal tab, red banner, blue scroll | Drawn at measured width |
| `CloseButton` | Red disc, white ring, white X | |
| `CreamBox` | Inner box | Sunken top edge, lit bottom edge |
| `ResourcePill` | Lives / coins pill | Art icon overlapping the left end |
| `HudPanel` | Moves / Goal / Score | Red tab, white outlined number, `urgent` |
| `StarBar` (`ProgressBar`) | Score bar with stars under it | |
| `StarRow`, `KitStar` | Chubby gold stars | Unearned = darker silhouette of the surface |
| `StarRibbon` | Stars on the blue scroll | Result pop-ups |
| `Toggle` | Music / SFX switch | |
| `BlockTile` | Studded cube / letter tile | Views only (fast on a 7×7 board) |
| `BlockLogo` | BLOCK BLAST! | WORD cubes + KRUSH! gold |
| `BlockDigits` | Pixel-block level numbers | |
| `SkyBackground` | Sky / play backdrops | `variant` sky / play |
| `ScoreBurst`, `ComboBanner` | Block King bursts / kit "BLOCK BLAST!" celebration | |
| `GameIcon` (`src/ui/icons/`) | Icon row + glyphs | `name size color` |

Older components (`Surface`, `Badge`, `Stat`, `ProgressPill`, `GameHeader`,
`ResultSheet`, `DisplayTitle`, `Ribbon`, `CoinPill`, `XpBadge`, `StreakBadge`,
`TextField`, `EmptyState`, `FeedbackBanner`, `GameArtwork`) are restyled onto
the same tokens; prefer the kit components above in new layouts.

The dev page `?kit` (web dev build only: `npm run web`, then
`http://localhost:8081/?kit`, or `?kit=controls|icons|blocks`) shows every
primitive on one scroll. Screenshot it next to the kit before changing a
primitive.

## The flow, screen by screen

The kit's player journey is: **home (big gold Play, square buttons around it)
→ level pop-up (title tab, goal, stars, PLAY) → game (HUD, board, boosters,
gear) → result pop-up (stars on the scroll, points, Continue) → home**, with
Settings, More Lives, Shop and Levels as pop-ups over whatever is underneath.
WordKrush follows that journey for all three games.

Everything sits on a phone-width column (max 520 px) centred on the window;
backdrops are full-bleed.

### Shell (`App.tsx`)

- Menu screens draw `SkyBackground variant="sky"` behind the `TopBar`; game
  screens draw their own `variant="play"` and hide the top bar (a menu over a
  live round is a mis-tap waiting to happen).
- **No drawer.** The hamburger menu is gone, as in the kit. Its destinations
  moved: games → hub cards; Teams, Scores, Account → hub buttons; Sound,
  Vibration, Send feedback, Sign in → the Settings pop-up.
- `TopBar` — coral bar with a white bottom rim and rounded bottom corners. Hub:
  streak `ResourcePill` (flame) · compact `BlockLogo` · coin `ResourcePill`.
  Other menu screens: back `SquareButton` (sky) · screen title · coin pill.

### First visit (`OnboardingScreen`)

The kit's hero: sky, rays, clouds; `BlockLogo` dropping in cube by cube; the
owner's first-run line "Guess right. Keep the streak alive." in outlined white;
a hand tapping a cube; big **gold Play** (starts More or Less) and a blue
**All games**.

### Home (`HubScreen`)

Top bar, then a scroll of pop-up cards, then the kit's home dock:

1. **Daily chest** — a cream "paper" card with the chest icon, `Day n/7`, and a
   green **Claim** when ready; "Finish any run to unlock" / "Back tomorrow"
   otherwise. Claiming opens the chest pop-up (rays, coins, Continue).
2. **One `Panel` per game** — teal tab with the game name, key art in a white
   framed tile, tagline in a `CreamBox`, a best-score chip, and a green
   **PLAY**. XP level and progress sit in a strip above the cards.
3. **Dock** (fixed at the bottom, over the clouds): `[Settings gear] [Scores
   trophy]  [ PLAY gold ]  [Teams] [Account]` — the kit's home row. The gold
   Play opens the next suggested game's level pop-up.

### Level pop-up (`GameStartScreen`)

The kit's "LEVEL 2 / Bomb cells / Blast bombs before they go off / ★★☆ / Goal
×10 / PLAY" card, over the game's play sky:

- Tab: `LEVEL n` (Wordfall, Clueless) or the game name (More or Less).
- Heading and one-line description in outlined white.
- `StarRow` when the level has stars to show.
- `CreamBox` **Goal**: More or Less — names seen in this set with a bar;
  Clueless — the spark path (● ● ○ → vault) or the sealed-vault countdown;
  Wordfall — the level's objectives and move budget.
- Best / runs in two small cream boxes once the player has a score.
- Green **PLAY** (label from the caller), then small buttons: blue **Race with
  team**, purple **Scores**, sky **How to play** (Wordfall adds **Levels**).
- Provenance line under the card in small outlined white.

### Gameplay (all three games)

Top to bottom, the kit's game screen:

1. Row: back `SquareButton` (sky) · level `RibbonTitle` (small) · help `?`.
2. HUD: three `HudPanel`s — More or Less `Streak / Best / Seen` (race: `Goal`),
   Clueless `Guesses / Best / Level`, Wordfall `Moves` (or `Time`) `/ Goal /
   Score` with a `StarBar` under Score.
3. The board in a cyan frame (`palette.frame` rim, `palette.well` inside).
4. The game's action area (choice buttons / guess field / trace preview).
5. **Booster dock**: green `SquareButton`s with coin prices and captions, and
   the gold gear on the right, which opens the **Paused** pop-up (Resume,
   How to play, Leave game).

Juice (Block King): a correct call or a cleared word throws a `ScoreBurst`
from where it happened; streak milestones and cascades throw a `ComboBanner`
("GREAT!", "AMAZING!", "KRUSH!"); a miss shakes and flashes red.

**More or Less** — two photo cards stacked in the frame, each with a white rim,
name and number in outlined white on a dark foot band, `? ? ?` while hidden; a
glossy VS disc between them; the prompt line; green **MORE ▲** and red
**LESS ▼** side by side; Skip pair in the dock. A miss with coins to spare
offers a second chance as the kit's "More Lives?" pop-up (red banner, cream
box with the streak, green Second chance with price, blue No thanks).

**Clueless** — hint `CreamBox` with a teal label; cream guess field with a
green **Guess**; guesses as cream rows (word, rank chip, heat bar in the
proximity colour), the best one pinned with a gold rim; Warmer word in the
dock. Before the first guess: a `?` cube and "Find the secret word".

**Wordfall** — cream `BlockTile` letter tiles (navy letters) in the frame;
specials are coloured studded cubes carrying their shape glyph; crates are
stone cubes; the traced path turns tiles gold with a white glow line; trace
preview in a cream pill; Shuffle / Word hint / +3 moves in the dock. The level
map is the kit's **Levels** pop-up: rows with `BlockDigits` numbers, name,
move budget, stars and best points; the current row glows gold; locked rows
are stone with a lock.

### Results

The kit's "LEVEL COMPLETED" pop-up over the dimmed board:

- Tab `LEVEL n` (or the game name); win title "LEVEL COMPLETED" / "SOLVED!" /
  "GREAT RUN!"; loss title on a red banner ("GAME OVER", "OUT OF MOVES").
- `StarRibbon` with the stars from the reward events.
- Cream pill with the score ("1,250 pts", "Streak 12", "In 9 guesses").
- Reward chips (coins, XP) counting up; "Boosted run — not on the global
  board" when it applies.
- A new personal best adds Block King's red "NEW RECORD!" banner over a trophy.
- Green **Continue / Play again**, then square buttons: Home, Scores, Share
  (+ Levels for Wordfall).
- Level-up and milestone beats follow as their own pop-ups with rays.

### Other screens

- **Scores** — a full-height `Panel` "Leaderboard": game switch as three small
  glossy buttons (selected gold), local / global switch, rows as cream rows
  (medals for 1–3, name, score chip, date), the run just played in gold with a
  NEW badge, sign-in CTA in blue.
- **Account** — `Panel` "Account": explanation in a cream box, cream text
  fields, blue sign-in, the analytics `Toggle` in a cream row, red Sign out.
- **Teams / Lobby / Race results** — `Panel`s with cream rows; room codes in
  `BlockTile` letters; green Create / Start race, purple Join; race results
  as a podium list with medals.
- **Settings pop-up** — the kit's Final pop-up: tab "Settings"; cream box with
  **Sound** and **Vibration** `Toggle`s; blue **Account** (the kit's Connect);
  green **Scores** and **Teams** (the kit's Terms / Privacy pair); gold **Send
  feedback** (the kit's Contact us); "Player: name · v x.y.z" (the kit's User
  ID).
- **How to play / Feedback** — `PopupModal`s: numbered cream rows with a cube
  number; green "Got it, let's play" / "Send".

## Interaction

Values live in `theme.ts` `interaction` — do not restyle them per screen.

- Touch target minimum 44×44 (`interaction.minTouch`), `hitSlop` for anything
  drawn smaller (the close disc).
- Glossy controls (`Button`, `SquareButton`, `Toggle` knob) sink their face by
  the lip over `motion.pressMs` and spring back with `motion.snappy`, on web and
  native. Layout never moves; only `transform` does. Reduce-motion snaps.
- Disabled: grey tone, `accessibilityState.disabled`, and a reason
  (`disabledReason`, price chip, or copy).
- Pop-ups trap focus (`accessibilityViewIsModal`); the scrim closes only
  dismissable pop-ups.

## Motion

React Native `Animated` only (no Reanimated). Springs for presses and
entrances, `Easing.out(Easing.back(1.6))` for pop-ins, `motion.burstMs` for
score bursts. Reduce-motion (`useReduceMotion`) shows end states: no ray spin,
no confetti, no pops, bursts appear in place.

## Daily streak

`src/streak/` is pure logic + AsyncStorage persistence (`types.ts` pure and
tested, `storage.ts` non-fatal I/O). `recordPlay` is idempotent per local day;
`isAtRisk` drives the flame's "play today" state. Recorded after every finished
run in any game, not on app open. Shown in the top bar's flame pill.

## Token architecture

```
primitives (theme.ts: kit, palette, cube, tone, font, type, radius, space, shadow, motion)
      ↓
geometry (shapes.ts: outlines, tab / banner / star paths, clouds, pixel digits — pure, tested)
      ↓
components (src/ui/components/*, src/ui/icons/*)
      ↓
screens (src/ui/screens/*): compose components, own layout and copy only
```

Screens must not invent a pressed state, a card border, a gradient, a colour
or a font weight. If a screen needs something the library lacks, add it to the
library (and to the `?kit` page) first.

## History

- **2026-10-18 (0.9.0, superseded the same day):** sand page, wood playfield,
  warm-white cards and glossy pills on every screen (ST-108 / ST-109).
- **2026-08-22:** dark ink canvas with per-game accents, token layering and the
  first component library (Candy Crush / Scrabble / Apple HIG / Airbnb DLS /
  Duolingo lessons). The token layering, `PressableScale`, the daily streak and
  the reduce-motion rules survive from that pass.
