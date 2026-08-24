export type CluelessHint = {
  puzzleNumber: number;
  /** Guards editorial copy against drifting onto a different generated puzzle. */
  secret: string;
  text: string;
};

/**
 * Reviewed thematic prompts. These are deliberately separate from generated
 * embedding ranks so rebuilding puzzle JSON cannot erase or rewrite the copy.
 */
export const CLUELESS_HINTS: readonly CluelessHint[] = [
  { puzzleNumber: 1, secret: 'trouble', text: 'Where plans go when a smooth day suddenly takes a detour.' },
  { puzzleNumber: 2, secret: 'rent', text: 'A regular payment often comes with keys and a landlord.' },
  { puzzleNumber: 3, secret: 'people', text: 'A busy station becomes interesting through the lives passing by.' },
  { puzzleNumber: 4, secret: 'paragraph', text: 'One idea gets room to breathe between neighboring blocks of text.' },
  { puzzleNumber: 5, secret: 'chart', text: 'Useful when numbers need a picture before patterns become obvious.' },
  { puzzleNumber: 6, secret: 'already', text: 'The task was finished before anyone thought to ask about it.' },
  { puzzleNumber: 7, secret: 'cable', text: 'Often found trailing behind screens, routers, and musical equipment.' },
  { puzzleNumber: 8, secret: 'batteries', text: 'Remote controls become mysteriously useless when these quietly give up.' },
  { puzzleNumber: 9, secret: 'gambling', text: 'The next decision could multiply a stake or leave nothing behind.' },
  { puzzleNumber: 10, secret: 'famous', text: 'Crowds gather and cameras flash whenever this person enters the room.' },
  { puzzleNumber: 11, secret: 'furniture', text: 'Empty rooms feel finished after these practical pieces finally arrive.' },
  { puzzleNumber: 12, secret: 'third', text: 'One more arrival would turn a pair into a small group.' },
  { puzzleNumber: 13, secret: 'administration', text: 'Behind every organization, schedules, permissions, and paperwork keep moving.' },
  { puzzleNumber: 14, secret: 'ship', text: 'Cargo, crews, and distant ports share this ocean-going setting.' },
  { puzzleNumber: 15, secret: 'against', text: 'Picture rival teams meeting from different sides of the same field.' },
  { puzzleNumber: 16, secret: 'location', text: 'Maps, coordinates, and meeting plans all depend on getting this right.' },
  { puzzleNumber: 17, secret: 'going', text: 'Shoes are on, the door is open, and plans are underway.' },
  { puzzleNumber: 18, secret: 'home', text: 'Where familiar rooms, favorite mugs, and everyday routines come together.' },
  { puzzleNumber: 19, secret: 'alert', text: 'A sudden sound or banner asks for your immediate attention.' },
  { puzzleNumber: 20, secret: 'none', text: 'Every cookie vanished before the late guest reached the plate.' },
  { puzzleNumber: 21, secret: 'mother', text: 'Family stories often begin with her voice, care, and encouragement.' },
  { puzzleNumber: 22, secret: 'blue', text: 'A calm color often chosen for uniforms, logos, and quiet rooms.' },
  { puzzleNumber: 23, secret: 'bond', text: 'Two characters grow closer after surviving a difficult journey together.' },
  { puzzleNumber: 24, secret: 'instance', text: 'A teacher points to one apple while discussing the whole basket.' },
  { puzzleNumber: 25, secret: 'several', text: 'Enough friends arrived to start a game without filling the room.' },
  { puzzleNumber: 26, secret: 'conference', text: 'Name badges, packed schedules, and hallway conversations fill the venue.' },
  { puzzleNumber: 27, secret: 'rental', text: 'A holiday apartment comes with keys, rules, and a checkout time.' },
  { puzzleNumber: 28, secret: 'signal', text: 'A lighthouse flash carries meaning across dark and distant water.' },
  { puzzleNumber: 29, secret: 'begin', text: 'A quiet countdown reaches zero, then the adventure finally moves.' },
  { puzzleNumber: 30, secret: 'festival', text: 'Music, food stalls, decorations, and crowds transform an ordinary weekend.' },
] as const;

const HINT_BY_PUZZLE = new Map(CLUELESS_HINTS.map((hint) => [hint.puzzleNumber, hint]));

export function hintForPuzzle(puzzleNumber: number): CluelessHint {
  const hint = HINT_BY_PUZZLE.get(puzzleNumber);
  if (!hint) throw new Error(`Missing Clueless hint for puzzle ${puzzleNumber}`);
  return hint;
}
