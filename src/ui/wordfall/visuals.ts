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
import { contrastRatio, cube, palette, type CubeColor } from '../theme';

export type SpecialVisual = {
  /** Face colour (hex), for chips and previews. */
  color: string;
  /** The studded cube this special sits on. */
  cube: CubeColor;
  /** Drawn small in the tile corner, over the letter. */
  glyph: string;
  /** Used in the legend and in accessibility labels. */
  shape: string;
};

/**
 * Normal letters are cream cubes, so a special is the only coloured cube on
 * the board — it reads at a glance, as the kit's coloured cells do.
 */
export const SPECIAL_VISUALS: Record<SpecialKind, SpecialVisual> = {
  // Letter hunt.
  ember: { color: cube.green, cube: 'green', glyph: '◆', shape: 'every matching letter' },
  // The biggest blast is purple, so the rarest reward reads as the richest face.
  nova: { color: cube.purple, cube: 'purple', glyph: '■', shape: '3×3 block' },
  beam: { color: cube.blue, cube: 'blue', glyph: '+', shape: 'row and column' },
  flare: { color: cube.red, cube: 'red', glyph: '✕', shape: 'both diagonals' },
};

/** Navy ink where it clears 4.5:1 on the face, white otherwise. */
export function specialInk(color: string): string {
  return contrastRatio(palette.ink, color) >= 4.5 ? palette.ink : palette.white;
}
