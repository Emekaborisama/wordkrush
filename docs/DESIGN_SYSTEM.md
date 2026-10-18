# Design System — WordKrush

**Last updated:** 2026-10-18

This is the source of truth for visual and interaction decisions across the
hub and every game. Read it before adding a screen or component. It exists so
"redesign the app" turns into "extend one system" instead of "restyle seven
screens by hand."

Product name, logo use, and brand colour live in
[`docs/branding/`](branding/README.md). This file does not restyle the lockup.
The wordmark stays on its own ink; screens do not.

## Screen chrome (owner, 2026-10-18)

The flat dark ink canvas is superseded. Every game shares one casual-game
chrome. A game changes its ribbon colour and its accent, nothing else.
Hexes live in `palette` in `src/ui/theme.ts` and are recorded in
[`docs/branding/color.md`](branding/color.md).

| Surface | Token |
|---|---|
| Page | `screen.page` / `palette.sand` (`#F4E4C4`) |
| Playfield | `screen.playfield` / `palette.wood` (`#6B3E26`), plank `palette.plank` |
| Cards, sheets, wells | `palette.paper` (`#FFF8EE`). `Surface` defaults to this. `variant="wood"` is the playfield. |
| Text on sand or paper | `palette.brown` (`#3A2415`) |
| Text on wood | `palette.paper` |
| Primary CTA | Glossy green pill. White label. Face is a deeper shade of `#3DCC4A` so the label clears 4.5:1 under the gloss. |
| Other pills | `tone` `purple`, `blue`, `coral` (white label), `ribbon` (yellow, brown label) |
| Stars and titles | Gold `#FFC107`, orange edge, brown outline |
| Inset scores | `theme.well` (brown) with paper text |

`theme.bg` is sand. Do not paint a screen `#0A0817`. The logo still uses `brand`.

## Where this came from

Four references, one lesson each, applied to a dark-first casual game hub:

- **Candy Crush** — a game needs a *felt* identity, not a label. Each title in
  the hub (WordKrush comparison, Clueless, Wordfall) gets a full accent ramp (soft /
  base / dim), not one hex value reused inconsistently. Feedback is springy
  and celebratory by default; nothing acknowledges a tap with just a colour
  change.
- **Scrabble** — informational rigor. Tabular numerals for anything that
  changes in place (already true for proximity scores; now true everywhere a
  number updates: streaks, ranks, run counts). Hierarchy between the number
  that matters and the label under it is a fixed pattern (`Stat`), not
  redrawn per screen.
- **Apple (HIG)** — restraint through systemization. One pressed-state, one
  touch-target minimum (44pt), one spring curve per interaction class. Screens
  compose primitives; they do not invent new opacity values or border widths.
- **Airbnb (DLS)** — token layering and cross-platform parity. Primitive →
  semantic → component tokens, one component library consumed by both the
  Expo web export and the native app, so a fix in one place fixes both
  targets.
- **Duolingo** — a streak is a relationship with the player, not a stat. It
  gets a dedicated visual (flame), a "protect it" framing rather than a
  neutral count, and a distinct at-risk state (played yesterday, not yet
  today) instead of silently ticking to zero at midnight. This is why the app
  now has a cross-game **daily streak** (`src/streak/`) alongside each game's
  own in-run streak — WordKrush comparison's run streak resets on the first wrong
  guess; the daily streak is the thing that keeps a player coming back
  tomorrow.

## Daily streak

`src/streak/` is pure logic + AsyncStorage persistence, mirroring the shape of
`src/scores/`: `types.ts` (pure, tested), `storage.ts` (I/O, non-fatal on
failure). It is deliberately a separate concept from any one game's score:

- `recordPlay(streak, today)` — idempotent per calendar day; extends on a
  1-day gap, resets `current` (not `longest`) on a 2+ day gap, ignores a
  clock that appears to have moved backwards.
- `isAtRisk(streak, today)` — true when a live streak has not been extended
  yet today. Drives the dim-vs-lit flame in `StreakBadge`.
- Recorded from `App.tsx` after every successful `recordScore` call, across
  all three games — finishing a run in any game counts, not just opening the
  app.
- Rendered via `Stat` with `variant="streak"` (`StreakBadge`) in the Hub
  header, next to the page title.

## Token architecture

```
primitives (theme.ts: brand, bg, card, accent, radius, space, type, shadow, motion)
      ↓
semantic helpers (theme.ts: elevation(), withAlpha(), gameAccentTokens())
      ↓
components (src/ui/components/*): Button, Surface, Stat, ScreenHeader, Badge, PressableScale
      ↓
screens (src/ui/screens/*): compose components, own layout and copy only
```

Screens must not:
- invent a new pressed-opacity or scale value — use `PressableScale` or the
  `interaction` tokens it wraps;
- hand-pick a card border/background combination — use `Surface` with an
  elevation level;
- compute a game's soft/dim tint inline (`accent + '22'`) — use
  `gameAccentTokens(accent)`.

### Elevation

`elevation(level)` in `theme.ts` returns the `{ backgroundColor, borderColor,
borderTopColor }` triple for a given depth (`0` = page background through `3`
= the highest raised surface, e.g. an active/highlighted row). This replaces
each screen picking `theme.card` vs `theme.cardHigh` vs `theme.bgElevated` by
feel. Depth order, back to front:

| Level | Token | Use |
|---|---|---|
| 0 | `bg` | Page background |
| 1 | `bgElevated` | Footer bars, drawer panel, table rows |
| 2 | `card` | Default card / list item |
| 3 | `cardHigh` | Highlighted / selected card |

### Tinting a colour

`withAlpha(colour, alpha)` is the only place alpha is applied. It handles both
colour formats the app produces — hex (`#rrggbb` → `#rrggbbaa`) and the `hsl()`
strings from `proximityColor()` (→ `hsla()`). Do not build a tint by string
concatenation: a hex suffix appended to `hsl(...)` is an invalid colour that
renders **fully opaque** instead of throwing, which is how Clueless guess-row
ranks were once drawn in the same colour as the pill behind them.

### Per-game accent

`gameAccentTokens(accent)` derives `{ accent, soft, dim, border, glow, ink }`
from a single base hex so every game's identity (hub card art tile, in-play
CTA, result panel) is consistent without each screen re-deriving alpha
variants. Games keep one accent hex in `registry.ts`; everything else follows.

### Interaction

Values live in `theme.ts` `interaction` — do not restyle them per screen.

- Touch target minimum: 44×44 (`interaction.minTouch`). `hitSlop` makes up the
  difference on smaller glyphs — see `TopBar` and `IconButton`.
- Pressed state, bevel buttons (`Button`, `RoundIconButton`): the face
  translates down by its bevel (6 / 5 / 4 px) over `motion.pressMs` (70ms) on
  **web and native**, then springs back with `motion.snappy`. The old rule —
  opacity-only on web, because a scale under a mouse cursor felt like jank —
  is superseded. A short face translation reads as a press without the control
  shrinking away from the pointer. Layout does not move; only `transform` does.
  Reduce-motion snaps to the pressed offset.
- Pressed state, other controls: `PressableScale` still scales on native only
  (`0.97`) and exposes `pressed` so a bevel button can drive its own face.
  Pass `translateOnPress={false}` when the face owns the vertical motion.
- Disabled state: opacity 0.5, `accessibilityState.disabled`, and the control
  must still explain *why* (a `SOON` / `DROPS` badge, or `disabledReason` on
  `RoundIconButton`).
- Label floor: 11px. Do not dim a label with opacity; `theme.textMuted` already
  clears 4.5:1 on sand and on paper.

## Component inventory

Located in `src/ui/components/`.

| Component | Replaces | Status |
|---|---|---|
| `PressableScale` | per-screen `pressed && styles.pressed` | ✅ built |
| `Button` | Home's `play`/`scores`, Scores' `signInBtn`/`back` | ✅ built |
| `Surface` | ad hoc `theme.card`/`bgElevated` + border blocks | ✅ built |
| `Stat` | Home's `bestBox`, Scores' `Stat()`, Game's streak header | ✅ built |
| `ScreenHeader` | Hub/Home/Scores title+subtitle blocks | ✅ built |
| `GameHeader` | in-play back / title / help chrome | ✅ built |
| `Badge` | `SOON`, `THIS RUN` pills | ✅ built |
| `ProgressPill` | in-play streak / guess / budget chips | ✅ built |
| `FeedbackBanner` | correct/wrong/rejection copy under the board | ✅ built |
| `ResultPanel` | Game Over / Wordfall level-outcome summaries | ✅ built |
| `EmptyState` | Scores' empty block, Clueless first-guess prompt | ✅ built |
| `GameArtwork` | Hub's emoji art tile (`IconTile` was not built) | ✅ built |
| `Mascot` | Hub deer + outcome poses (`src/ui/lottie/`, `LOTTIE_CLIPS`) | ✅ built |
| `BrandArtwork` | Drawer/top-bar W mark; auth clear lockup | ✅ built |
| `IconButton` | 44pt icon hits on game headers | ✅ built |
| `TextField` | Clueless guess input (and auth / team forms). Typed text uses Fredoka semibold; web hides the UA focus outline so only the designed shell border shows (D-030) | ✅ built |
| `GameStartScreen` | per-game pre-run screens (was More-or-Less-only `HomeScreen`) | ✅ built |
| `DisplayTitle` | Outlined gold titles (result, level-up). Not the logo. | ✅ built |
| `StarRow` | Three stars, centre larger, staggered pop. `onStar` for sound. | ✅ built |
| `StarBar` | Track with three markers that pop when crossed. | ✅ built |
| `Rays` | 12 wedges, one turn per `rayPeriodMs`. Static under reduce-motion. | ✅ built |
| `Confetti` | `Sparkle` burst-then-fall, dot or rect, at most 24. | ✅ built |
| `CoinPill` / `CoinIcon` | Gold coin, Fredoka "K", counting total. | ✅ built |
| `XpBadge` | Level number and thin bar. `onPress` opens badges. | ✅ built |
| `CountUpText` | `useCountUp` as text. | ✅ built |
| `RoundIconButton` | Round booster, ≥44px, optional badge and disabled reason. | ✅ built |
| `Ribbon` | Level pill with folded tabs. | ✅ built |
| `ResultSheet` | Scrolling body, sticky action footer. | ✅ built |

## Rollout plan

1. ✅ Foundation: `theme.ts` semantic helpers + component primitives.
2. ✅ Proof screens: `HubScreen`, `HomeScreen`, `ScoresScreen` — one list
   screen, one hero/CTA screen, one data-table screen, migrated to prove the
   primitives cover the real range of layouts.
3. ⏳ `Drawer`, `TopBar`, `AuthScreen` — same primitives, no visual change
   expected, just de-duplication.
4. ✅ `GameOverScreen`, `CluelessScreen` — `GameHeader`, `Surface`, `Stat`,
   `ResultPanel`, `ProgressPill`. Guess-row animation kept; chrome uses
   `elevation(2)`.
5. ✅ In-play chrome: `GameScreen` cards/VS badge, Wordfall HUD / picker /
   outcome. `BoardView` gesture and tile animation were left untouched on
   purpose — migrate surface/button chrome only.
6. ✅ `EmptyState` + `GameArtwork`. An emoji-to-icon-font `IconTile` is not
   planned; key art is bundled PNGs.

## Motion

Layout, presses, drawers, Wordfall tiles, and the More or Less count-up stay
on React Native `Animated`. Lottie (`lottie-react-native`, D-032) is for the
deer mascot and later celebration clips — not for board physics or text pills.
Reduce-motion is one hook, `useReduceMotion`. It skips ray spin, confetti,
star pops, and the button spring, and it shows the end state.

Motion tokens on `motion`: `pressMs` 70, `popMs` 260, `staggerMs` 140,
`countXpMs` 900, `rayPeriodMs` 20000, `shakeMs` 320, `coinFlyMs` 650, plus the
existing `gentle` / `snappy` / `celebratory` springs. Pop-ins use
`Easing.out(Easing.back(1.6))`. Animate only `transform` and `opacity`.

These components do not call `feedback()`. They expose `onPress` / `onStar`
so the screen can play a sound.

## Non-goals for this pass

- No Reanimated. `PressableScale` uses React Native `Pressable` transforms.
  BoardView/Drawer keep their existing `Animated` springs.
- No second theme beside this chrome. The 2026-10-18 owner decision replaced
  the dark ink screens with sand, wood, and warm white. Per-game colour is a
  ribbon and an accent, not a new background. The logo is not part of that
  change.
- No emoji-to-icon-font migration. Player-facing marks are `GameArtwork`
  bundles. Swapping to a real icon/mark system is tracked as its own decision
  because it touches every game's key art, not just layout.
