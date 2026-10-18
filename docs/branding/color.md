# Colour

One palette. `src/ui/theme.ts` `brand` is the code copy of this table. Do not
introduce a third hex for the same role.

## Core

| Token | Hex | Role |
|---|---|---|
| `brand.ink` | `#0A0817` | Page, splash, icon field |
| `brand.word` | `#FFF9F6` | Primary text; "Word" in the lockup |
| `brand.krush` | `#FFB020` | Umbrella accent; "Krush" gold |
| `brand.krushHot` | `#FF8C00` | Hot end of the Krush gradient, spark accents |
| `brand.purple` | `#8B6BFF` | Secondary accent; lockup tiles and glow |
| `brand.purpleDeep` | `#2E0854` | Lockup outline / deep shade |

`brand` paints the lockup only. It is not the screen canvas.

## Screen chrome (owner, 2026-10-18)

These hexes replace the flat dark ink screens. They do not replace the logo.
`palette` in `src/ui/theme.ts` is the code copy. Do not invent another hex for
the same role.

| Token | Hex | Role |
|---|---|---|
| `palette.sand` | `#F4E4C4` | Page behind the playfield. `theme.bg`, `screen.page` |
| `palette.wood` | `#6B3E26` | Playfield. `screen.playfield` |
| `palette.plank` | `#8B5A2B` | Lighter wood |
| `palette.paper` | `#FFF8EE` | Cards, result sheets, input wells, text on wood |
| `palette.brown` | `#3A2415` | Text on sand or paper. Display-title outline |
| `palette.green` | `#3DCC4A` | Primary CTA identity. Gloss and non-text green |
| `palette.greenBevel` | `#1E8A28` | Named green lip. A white label sits on a deeper shade of `palette.green`, because white on `#3DCC4A` is about 2.11:1 |
| `palette.purple` | `#7B4FD6` | Purple pill, XP badge |
| `palette.blue` | `#2F9BFF` | Blue pill |
| `palette.coral` | `#FF5A7A` | Coral pill |
| `palette.ribbon` | `#FFC83D` | Level ribbon. Brown label |
| `palette.star` | `#FFC107` | Stars, coin, gold titles |
| `palette.starEdge` | `#E8780C` | Orange star outline. The shots name the colour; this is the hex |

`palette.brownMuted` (`#6B4630`) is the secondary label. It clears 4.5:1 on
sand and on paper, which opacity-dimmed text did not.

Reward gold is `palette.star`. The title outline is `palette.brown`. Neither
is a new brand colour for the logo. `reward` in `theme.ts` points at these.

## Games

Per-title accents stay in `src/games/registry.ts`. They are not the umbrella
brand; they sit on the same ink.

| Game | Accent | Why it is allowed |
|---|---|---|
| More or Less | `#32E487` | Comparison / "correct" green |
| Clueless | `#9B78FF` | Neighbour of `brand.purple` |
| Wordfall | `#FFB020` | Same gold as `brand.krush` |

## Contrast

Body copy on a screen is `palette.brown` on `palette.sand` or `palette.paper`.
Text on wood is `palette.paper`. A white pill label sits on the contrast-safe
face from `readableWhiteFace`, not on the raw bright green. The lockup still
uses `brand.word` on `brand.ink`. Do not set body text in star gold or in the
bright pill colours: those are fills.
