# Logos

The lockup is the brand. The W is the small-size icon. Prefer the transparent
lockup whenever the surface already supplies `brand.ink`.

## Lockup on black — `assets/logo/wordkrush-lockup.png`

Full composition on black: golden crown, glowing brain, **Word** in white,
**Krush** in gold-orange, scattered letter tiles.

Use when the name is the hero and the plate behind it is black:

- Launch splash
- Marketing, site header, store screenshots
- End cards and share art

Do not place the lockup next to a second "WordKrush" wordmark. Do not use it
below ~120px — the tiles and crown collapse.

## Lockup, clear — `assets/logo/wordkrush-lockup-clear.png`

Same drawing, transparent field. Use on `brand.ink` (`#0A0817`) so a black
square does not show against the app background.

- Auth hero (`BrandArtwork variant="lockup"`)
- Android adaptive icon foreground

## Lockup, tight — `assets/logo/wordkrush-lockup-tight.png`

The clear lockup cropped to its content box (1254×889). The square masters
carry ~35% vertical transparent padding, which is what made the lockup shrink
to nothing in a header slot. This is the file `BrandArtwork variant="lockup"`
renders; `size` is its HEIGHT and the width follows the 1.41 aspect.

## Vector — `assets/logo/wordkrush-lockup.svg`

Master for re-export. Do not `require()` it in app code; it is a 2 MB source
file, not a runtime asset.

## Mark — `assets/logo/wordkrush-mark.png`

The lockup's purple **W** letter tile, isolated on `brand.ink` with a soft
purple glow. This is the app icon. `wordkrush-mark-clear.png` is the same
tile on a transparent field, for use on a surface that already supplies ink.

Derived from the lockup rather than drawn separately, so the icon and the
wordmark share one object. The tile keeps its natural tilt — it is masked out
of the lockup, never rotated or recoloured.

Use when the control is small or already sits next to the name:

- iOS/Android icon, favicon
- Hub hero, drawer, and top bar via `BrandArtwork` (default)
- Notification and settings glyphs

## The mascot is not the logo

The deer (`src/ui/lottie/Mascot.tsx`) is decoration, not identity. It never
occupies a brand slot — the header, drawer, and top bar always carry the mark.

## Clear space and background

- Give the lockup at least a quarter of its height as empty margin.
- The ~120px floor is a WIDTH, and app chrome is too short to clear it. The
  hub header and top bar both carry the mark plus a text wordmark; the
  lockup is reserved for surfaces with room — splash and the auth hero.
- Prefer `brand.ink` (`#0A0817`) or black. The opaque lockup already includes
  a black field — do not drop it onto white, a photo, or a game accent without
  a dark plate. The clear lockup must sit on dark ink.
- Do not rotate, skew, recolor, add a drop shadow, or set the files as a
  repeating pattern.
- Do not crop the crown, brain, or tiles off the lockup. If you need a square
  at small size, use the mark. (The mark itself is the one sanctioned
  extraction — the W tile, masked to its own silhouette.)

## Platform copies

These are what Expo reads. Keep them in sync with `assets/logo/`.

| Expo path | Source |
|---|---|
| `assets/icon.png` | mark, 1024px, **no alpha channel** (iOS rejects icons with alpha) |
| `assets/splash.png` | lockup (black) |
| `assets/favicon.png` | mark, 192px |
| `assets/android-icon-foreground.png` | lockup clear, 1024px |
