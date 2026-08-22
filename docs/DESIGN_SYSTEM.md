# Design System — WordCrush

**Last updated:** 2026-08-22

This is the source of truth for visual and interaction decisions across the
hub and every game. Read it before adding a screen or component. It exists so
"redesign the app" turns into "extend one system" instead of "restyle seven
screens by hand."

## Where this came from

Four references, one lesson each, applied to a dark-first casual game hub:

- **Candy Crush** — a game needs a *felt* identity, not a label. Each title in
  the hub (WordCrush comparison, Clueless, Wordfall) gets a full accent ramp (soft /
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
  own in-run streak — WordCrush comparison's run streak resets on the first wrong
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
primitives (theme.ts: bg, card, accent, radius, space, type, shadow, motion)
      ↓
semantic helpers (theme.ts: elevation(), withAlpha(), gameAccentTokens())
      ↓
components (src/ui/components/*): Button, Surface, Stat, ScreenHeader, Badge, PressableScale
      ↓
screens (src/ui/screens/*): compose components, own layout and copy only
```

Screens must not:
- invent a new pressed-opacity or scale value — use `PressableScale` or the
  `motion` tokens it wraps;
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

### Per-game accent

`gameAccentTokens(accent)` derives `{ accent, soft, dim, border }` from a
single base hex so every game's identity (hub card art tile, active nav item,
CTA) is consistent without each screen re-deriving alpha variants. Games keep
one accent hex in `registry.ts`; everything else follows.

### Interaction

- Touch target minimum: 44×44 (`hitSlop` makes up the difference on smaller
  glyphs — see `TopBar`).
- Pressed state: `PressableScale` — opacity 0.85 + scale 0.985 on native
  (spring, `motion.snappy`), opacity-only on web where scale-on-press reads as
  janky with a mouse cursor still present.
- Disabled state: opacity 0.5, `accessibilityState.disabled`, and the control
  must still explain *why* (a `SOON` badge, not a card that silently does
  nothing).

## Component inventory

Located in `src/ui/components/`.

| Component | Replaces | Status |
|---|---|---|
| `PressableScale` | per-screen `pressed && styles.pressed` | ✅ built |
| `Button` | Home's `play`/`scores`, Scores' `signInBtn`/`back` | ✅ built |
| `Surface` | ad hoc `theme.card`/`bgElevated` + border blocks | ✅ built |
| `Stat` | Home's `bestBox`, Scores' `Stat()`, Game's streak header | ✅ built |
| `ScreenHeader` | Hub/Home/Scores title+subtitle blocks | ✅ built |
| `Badge` | `SOON`, `THIS RUN` pills | ✅ built |
| `IconTile` | Hub's emoji art tile, Drawer's `Item` icon slot | ⏳ next |
| `EmptyState` | Scores' empty block, future no-connection states | ⏳ next |

## Rollout plan

1. ✅ Foundation: `theme.ts` semantic helpers + component primitives (this
   change).
2. ✅ Proof screens: `HubScreen`, `HomeScreen`, `ScoresScreen` — one list
   screen, one hero/CTA screen, one data-table screen, migrated to prove the
   primitives cover the real range of layouts.
3. ⏳ `Drawer`, `TopBar`, `AuthScreen` — same primitives, no visual change
   expected, just de-duplication.
4. ⏳ `GameOverScreen`, `CluelessScreen` — verify `Stat`/`Button` cover the
   remaining result/summary layouts.
5. ⏳ `GameScreen` / `BoardView` / wordfall UI — deliberately last. These carry
   the highest-risk, most-tested animation logic (drag hit-testing, spring
   drops, count-up reveals). Migrate surface/button chrome only; do not touch
   gesture or animation code in the same change.
6. ⏳ `IconTile` + `EmptyState` components, once a second consumer of each
   exists beyond the hub.

## Non-goals for this pass

- No new dependency. `PressableScale` uses `Animated` from `react-native`
  core, matching the existing pattern in `BoardView`/`Drawer` — not React
  Native Reanimated.
- No new theme (still one dark theme). A light theme or per-game background
  swap is a product decision, not implied by this change — flag it as an
  `[OPEN]` design question if it comes up.
- No emoji-to-icon-font migration. `IconTile` will still render `game.emoji`
  today; swapping to a real icon/mark system is tracked as its own decision
  because it touches every game's key art, not just layout.
