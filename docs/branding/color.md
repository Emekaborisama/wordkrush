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

## Screen chrome: the Block Blast kit (owner, 2026-10-18, ST-112)

Every screen follows the Block Blast UI kit (Room 8 Studio). These hexes are
the kit's five main colours plus the gradient ends, rims and lips sampled from
its screens. `kit`, `palette`, `cube` and `tone` in `src/ui/theme.ts` are the
code copy. They do not replace the logo. Do not invent another hex for the
same role.

| Token | Hex | Role |
|---|---|---|
| `kit.coral` / `palette.coral` | `#F15D70` | Pop-up panel body (kit main colour) |
| `kit.sky` / `palette.sky` | `#6BB9E0` | Sky (kit main colour) |
| `kit.cream` / `palette.cream` | `#FFE1BE` | Inner boxes (kit main colour) |
| `kit.green` / `palette.green` | `#62AC25` | Primary CTA identity (kit main colour) |
| `kit.teal` / `palette.teal` | `#2DADBD` | Ribbon title tab (kit main colour) |
| `palette.coralTop` / `coralBottom` | `#FB8F99` / `#E6556A` | Panel gradient ends |
| `palette.coralEdge` | `#C43C53` | Panel keyline; outline of white copy on coral |
| `palette.creamFill` / `creamEdge` / `creamShade` | `#FFEAD3` / `#EEC39B` / `#F7D5B3` | Cream box fill, rim, sunken top band |
| `palette.navy` / `navyDeep` | `#285FAD` / `#173F7E` | Page backdrop behind the sky; deep outline |
| `palette.skyTop` / `skyMid` / `skyBottom` | `#2F7FDB` / `#58AEEA` / `#B8EAF8` | Menu sky gradient |
| `palette.playTop` / `playBottom` | `#41B2E1` / `#97DEF2` | Gameplay sky gradient |
| `palette.frame` / `frameDeep` / `well` | `#38C5EA` / `#179BC8` / `#C2EEFA` | Board frame, its rim, empty cells |
| `palette.ink` / `inkSoft` | `#173A63` / `#3D5D85` | Text on cream or white |
| `palette.tealInk` | `#0E6874` | The kit's teal labels on cream (Music / SFX) |
| `palette.red` / `redDeep` | `#EF3E4F` / `#B21F38` | Close disc, HUD tabs, banner ribbon |
| `palette.gold` / `goldDeep` / `goldEdge` | `#FFC928` / `#F29A0B` / `#A85A00` | Stars, coins, hero Play |

Glossy faces (`tone.green`, `blue`, `gold`, `red`, `purple`, `teal`, `coral`,
`sky`, `grey`) each carry `top`, `bottom`, `lip` and `outline`; the green,
blue and gold ends were sampled from the kit's Terms, Connect and Contact us
buttons. Cubes (`cube.*`) are the board colours.

The sand / wood / paper / brown chrome from 0.9.0 is superseded. Its names
survive in `palette` only as deprecated aliases while code migrates.

## Games

Per-title accents stay in `src/games/registry.ts`. They are not the umbrella
brand; they sit on the same ink.

| Game | Accent | Why it is allowed |
|---|---|---|
| More or Less | `#32E487` | Comparison / "correct" green |
| Clueless | `#9B78FF` | Neighbour of `brand.purple` |
| Wordfall | `#FFB020` | Same gold as `brand.krush` |

## Contrast

Copy on cream or white is `palette.ink` (navy) or `palette.inkSoft`; both clear
4.5:1 on every cream and on the board well, and `palette.tealInk` clears it on
cream. Copy on coral, sky or a glossy face is white with an outline in the
surface's darkest shade (`palette.coralEdge`, `palette.navyDeep`,
`tone.*.outline`), which clears 4.5:1 against the white glyph — the kit's own
treatment. Long copy goes in a cream box, never as paragraphs of white on
colour. The lockup still uses `brand.word` on `brand.ink`. `theme.test.ts`
asserts these pairs.
