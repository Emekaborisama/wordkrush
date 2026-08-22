/**
 * How special tiles look.
 *
 * The glyphs are not decoration — each one is a picture of the shape that tile
 * will clear. A player who has never read the instructions can still see that
 * `+` takes a row and a column and `✕` takes the diagonals, which is the
 * difference between a rule you memorise and a rule you can read off the board.
 *
 * Kept separate from `linguistics.ts` so the rules stay pure data with no
 * styling in them, and separate from `theme.ts` because these four colours mean
 * something in exactly one game.
 */
import type { SpecialKind } from '../../games/wordfall/types';

export type SpecialVisual = {
  color: string;
  /** Drawn small in the tile corner, over the letter. */
  glyph: string;
  /** Used in the legend and in accessibility labels. */
  shape: string;
};

export const SPECIAL_VISUALS: Record<SpecialKind, SpecialVisual> = {
  // Fire, for the rare-letter tile — the one that hunts a letter across the
  // whole board rather than clearing a shape.
  ember: { color: '#FB923C', glyph: '◆', shape: 'every matching letter' },
  // The biggest blast gets the app's existing violet, so the rarest reward
  // reads as the most valuable without inventing a new colour.
  nova: { color: '#9B78FF', glyph: '■', shape: '3×3 block' },
  beam: { color: '#43D8FF', glyph: '+', shape: 'row and column' },
  flare: { color: '#FFD05A', glyph: '✕', shape: 'both diagonals' },
};

/** Tile face colour, tuned so letters stay legible on a dark board. */
export const TILE = {
  face: '#29244A',
  faceEdge: '#504777',
  faceDepth: '#17132D',
  crate: '#362717',
  crateEdge: '#72512A',
  crateDepth: '#1D140B',
  crateMark: '#D6A85E',
} as const;
