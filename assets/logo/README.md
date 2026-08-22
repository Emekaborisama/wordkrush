# Logo files

Canonical WordKrush logo masters. Usage rules live in
[`docs/branding/logos.md`](../../docs/branding/logos.md). Do not restyle or
recolor these files in place — add a new named variant instead.

| File | What it is | Use |
|---|---|---|
| `wordkrush-lockup.png` | Full lockup on black | Splash, marketing, store screenshots |
| `wordkrush-lockup-clear.png` | Same lockup, transparent field | Auth hero, Android adaptive foreground |
| `wordkrush-lockup.svg` | Vector master of the lockup | Re-export source; not bundled in the app |
| `wordkrush-mark.png` | App mark: 3D **W** | App icon, favicon, 28–72px chrome |
| `wordkrush-mark-clear.png` | Same W tile, transparent field | On surfaces that already supply `brand.ink` |
| `source/wordkrush-lockup.jpg` | Earlier raster delivery | Archive only |

Expo still reads the platform copies in `assets/` (`icon.png`, `splash.png`,
`favicon.png`, `android-icon-foreground.png`). Those are generated from this
directory; edit here first, then copy out.
