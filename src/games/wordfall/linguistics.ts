/**
 * Word analysis — the rule that turns a word into a special tile.
 *
 * This is the module the whole game hangs off. In a match-3 the reward for a
 * move is decided by geometry: five in a row makes a colour bomb. Here it is
 * decided by the WORD, so the player is not asking "what can I match?" but
 * "what kind of word do I want to make?".
 *
 * Two properties keep the mapping learnable:
 *
 *   TOTAL — every accepted word is analysed, though most earn nothing. Silence
 *           is a valid answer; a game that rewards everything rewards nothing.
 *
 *   PRIORITY-ORDERED — a word can satisfy several triggers at once (QUIZZED is
 *           long, has a rare letter and a doubled letter). Exactly one tile is
 *           awarded, from the FIRST rule that matches, so the player can always
 *           predict what they are about to get. Ranking rarest-condition-first
 *           means the hardest property earned is the one that pays.
 *
 * Rarity deliberately does NOT award a tile. It multiplies the score instead —
 * a fifth special keyed to something invisible on the board would be a rule the
 * player can never see coming.
 */
import type { SpecialKind } from './types';

/**
 * The letters that make a word feel hard-won.
 *
 * J, Q, X and Z are the four rarest in English by a wide margin, and crucially
 * they are rare on the BOARD too — the spawn weights are measured from real
 * usage — so an ember is genuinely a lucky find rather than a routine one.
 */
export const RARE_LETTERS = ['j', 'q', 'x', 'z'] as const;

export type WordProperties = {
  word: string;
  length: number;
  /** 0 = everyday word, 1 = rare. From the dictionary's frequency ranking. */
  rarity: number;
  /** Rare letters actually present, in the order they appear. */
  rareLetters: string[];
  /** True for BOOK and LETTER; false for BOAT. Adjacent repeats only. */
  hasDoubleLetter: boolean;
  distinctLetters: number;
  vowels: number;
  isPalindrome: boolean;
};

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

export function analyze(word: string, rarity: number): WordProperties {
  const rareLetters: string[] = [];
  let hasDoubleLetter = false;
  let vowels = 0;

  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    if ((RARE_LETTERS as readonly string[]).includes(ch)) rareLetters.push(ch);
    if (VOWELS.has(ch)) vowels++;
    if (i > 0 && ch === word[i - 1]) hasDoubleLetter = true;
  }

  return {
    word,
    length: word.length,
    rarity,
    rareLetters,
    hasDoubleLetter,
    distinctLetters: new Set(word).size,
    vowels,
    isPalindrome: word.length > 2 && word === [...word].reverse().join(''),
  };
}

/**
 * The trigger table, in priority order.
 *
 * Kept as data rather than an if-chain so the UI can render the same list as
 * the how-to-play legend. A rule that is explained in one place and implemented
 * in another drifts, and the player is the one who finds out.
 */
export const TRIGGERS: ReadonlyArray<{
  kind: SpecialKind;
  /** Short label for the legend. */
  label: string;
  /** The condition, phrased for a player rather than a programmer. */
  condition: string;
  /** What the tile does when a later word runs through it. */
  effect: string;
  matches: (p: WordProperties) => boolean;
}> = [
  {
    kind: 'ember',
    label: 'Ember',
    condition: 'Uses J, Q, X or Z',
    effect: 'Burns every tile sharing its letter',
    matches: (p) => p.rareLetters.length > 0,
  },
  {
    kind: 'nova',
    label: 'Nova',
    condition: '7 letters or more',
    effect: 'Blows out the 3×3 around it',
    matches: (p) => p.length >= 7,
  },
  {
    kind: 'beam',
    label: 'Beam',
    condition: '5 or 6 letters',
    effect: 'Clears its whole row and column',
    matches: (p) => p.length >= 5,
  },
  {
    kind: 'flare',
    label: 'Flare',
    condition: 'Has a double letter',
    effect: 'Clears both diagonals',
    // Length-gated so three-letter repeats like "eel" and "add" do not hand out
    // a special for what is really just a short word.
    matches: (p) => p.hasDoubleLetter && p.length >= 4,
  },
];

/** The special this word earns, or null if it earns none. */
export function specialFor(props: WordProperties): SpecialKind | null {
  return TRIGGERS.find((t) => t.matches(props))?.kind ?? null;
}

/**
 * Score for a word, before chain multipliers.
 *
 * Three things compound, and they are chosen so that no single one dominates:
 *
 *   LETTER VALUE — measured from the board's own spawn weights, so a Q is
 *   worth more than an E because it is genuinely harder to find, not because a
 *   table said so.
 *
 *   LENGTH — squared. Match-3 players expect a big move to feel disproportionate,
 *   and a linear curve makes seven-letter words feel like a waste of a turn.
 *
 *   RARITY — up to triple. This is what stops the optimal strategy from being
 *   "spell THE, AND, THE, AND"; the same five letters pay very differently
 *   depending on which word you saw in them.
 */
export function scoreWord(
  props: WordProperties,
  letterValue: (letter: string) => number,
): number {
  let base = 0;
  for (const ch of props.word) base += letterValue(ch);

  const lengthMultiplier = (props.length * props.length) / 4;
  const rarityMultiplier = 1 + props.rarity * 2;

  return Math.round(base * lengthMultiplier * rarityMultiplier);
}

/**
 * Point value of a letter, derived from how often it is stocked on the board.
 *
 * Deriving this from the measured spawn weights rather than hand-typing a
 * Scrabble table keeps one source of truth: if the letter distribution is ever
 * rebuilt from a different corpus, scoring follows automatically instead of
 * quietly disagreeing with the board.
 *
 * The square root compresses the range — raw inverse frequency makes a Z worth
 * fifty times an E, which turns the game into a hunt for one letter.
 */
export function letterValues(
  weights: ReadonlyArray<readonly [string, number]>,
): Map<string, number> {
  const values = new Map<string, number>();
  for (const [letter, weight] of weights) {
    values.set(letter, Math.max(1, Math.round(12 / Math.sqrt(Math.max(1, weight)))));
  }
  return values;
}
