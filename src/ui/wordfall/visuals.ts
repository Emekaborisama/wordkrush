/**
 * How special tiles look.
 *
 * The glyphs are not decoration — each one is a picture of the shape that tile
 * will clear. A player who has never read the instructions can still see that
 * `+` takes a row and a column and `✕` takes the diagonals, which is the
 * difference between a rule you memorise and a rule you can read off the board.
 *
 * Kept separate from `linguistics.ts` so the rules stay pure data with no
 * styling in them. The four faces are the shared pill colours.
 */
import type { SpecialKind } from '../../games/wordfall/types';
import { contrastRatio, palette, shade } from '../theme';

export type SpecialVisual = {
  color: string;
  /** Drawn small in the tile corner, over the letter. */
  glyph: string;
  /** Used in the legend and in accessibility labels. */
  shape: string;
};

export const SPECIAL_VISUALS: Record<SpecialKind, SpecialVisual> = {
  // Letter hunt. Green face, white letter — the glyph stays readable on the fill.
  ember: { color: palette.green, glyph: '◆', shape: 'every matching letter' },
  // The biggest blast is purple, so the rarest reward reads as the richest face.
  nova: { color: palette.purple, glyph: '■', shape: '3×3 block' },
  beam: { color: palette.blue, glyph: '+', shape: 'row and column' },
  flare: { color: palette.coral, glyph: '✕', shape: 'both diagonals' },
};

/** Brown ink on the brighter faces, white on purple, so the letter clears 4.5:1. */
export function specialInk(color: string): string {
  return contrastRatio(palette.brown, color) >= 4.5 ? palette.brown : palette.white;
}

/** Cream tiles on the wood board. Letters are brown; specials replace the face. */
export const TILE = {
  face: palette.paper,
  faceEdge: shade(palette.sand, 0.12),
  faceDepth: palette.plank,
  crate: palette.plank,
  crateEdge: palette.wood,
  crateDepth: shade(palette.wood, 0.28),
  crateMark: palette.sand,
} as const;
