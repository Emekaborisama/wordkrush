# WordKrush brand

**Last updated:** 2026-08-22
**Site:** [wordKrush.com](https://wordkrush.com)

This directory is the source of truth for product identity: name, voice, logo
use, and colour. Interaction tokens, components, and screen composition stay
in [`docs/DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md). Hex values that ship in the
app live in `src/ui/theme.ts` (`brand` + `theme`).

## Identity

| | |
|---|---|
| **Name** | WordKrush |
| **Wordmark** | `WordKrush` — capital W, capital K, no space, no hyphen |
| **Domain** | wordKrush.com |
| **Promise** | Guess correctly, keep the streak alive, and beat your best score. |
| **Purpose** | Casual word and comparison games that strengthen cognitive skills and pattern recognition through repeated play. |

Do not write WordCrush, Word Crush, Wordkrush, or wordcrush in player-facing
copy. Technical leftovers (`more-or-less` game id, `bestgames.*` storage keys)
stay as they are (STACK D-028).

## Voice

Playful, direct, and short. Name the action and the stake. Prefer "keep the
streak alive" over abstract claims about cognition in UI chrome. Store and
site copy may use the longer purpose sentence.

## Kit map

| Need | Where |
|---|---|
| Logo files | [`assets/logo/`](../../assets/logo/) |
| Which logo, clear space, don'ts | [logos.md](logos.md) |
| Palette and token mapping | [color.md](color.md) |
| Typeface | Bundled **Fredoka** (STACK D-030); UI scale in `src/ui/theme.ts` |
| Components and motion | [`docs/DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) |

## In the app

- `BrandArtwork` renders the mark (default) or the clear lockup (`variant="lockup"`).
- Splash uses the lockup on black, composited on `#0A0817`.
- App icon and favicon use the W mark. Android adaptive foreground uses the clear lockup.
- The **mascot** is a little deer (`Mascot` in `src/ui/lottie/`). It sits on the hub hero. It is not the logo: do not replace the lockup or the W with it on splash, store icon, or auth.
