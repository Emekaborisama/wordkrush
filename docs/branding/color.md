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

`theme.bg` is `brand.ink`. `theme.text` is `brand.word`. `theme.accent` is
`brand.krush`. `theme.accentSecondary` is `brand.purple`.

## Games

Per-title accents stay in `src/games/registry.ts`. They are not the umbrella
brand; they sit on the same ink.

| Game | Accent | Why it is allowed |
|---|---|---|
| More or Less | `#32E487` | Comparison / "correct" green |
| Clueless | `#9B78FF` | Neighbour of `brand.purple` |
| Wordfall | `#FFB020` | Same gold as `brand.krush` |

## Contrast

Gold and purple are for fills, glows, and short labels — not long body copy.
Body copy is `brand.word` or `theme.textMuted` on `brand.ink`. Do not set
body text in `brand.krush` or `brand.purple`.
