/**
 * Wordfall's word lookup. Pure TypeScript — no React, no storage, no network.
 *
 * Two things make this more than a Set:
 *
 * 1. INFLECTIONS ARE COMPUTED, NOT STORED. The source dictionary lists lemmas
 *    only, so "cat" is present and "cats" is not. Storing every generated form
 *    cost ~450 KB of bundle for words nobody would ever trace. Instead a miss
 *    falls back to suffix-stripping: if the lemma is a word and the suffix
 *    follows a real English rule, the form is a word.
 *
 *    This over-accepts at the edges ("informationed" resolves). That is the
 *    correct direction to be wrong in — a false accept costs the player one odd
 *    word, a false reject costs them their trust in the game.
 *
 * 2. LOOKUP IS BINARY SEARCH OVER PACKED STRINGS, not a hydrated Set. Words are
 *    stored as one sorted fixed-width string per length, so a lookup is ~17
 *    character comparisons with zero allocation and, more importantly, zero
 *    startup cost. Building a 76k-entry Set on launch would stall the first
 *    frame of the app for no benefit.
 */

/** The shape of `src/data/wordfall/dictionary.json`. */
export type DictionaryData = {
  minLength: number;
  maxLength: number;
  /** Per-mille tile spawn weights, measured from `common`. */
  letters: Record<string, number>;
  /** Everyday words, most frequent first. Index is the rarity rank. */
  common: string[];
  /** length -> every valid word of that length, sorted, concatenated. */
  words: Record<string, string>;
};

export type Dictionary = {
  minLength: number;
  maxLength: number;
  isWord(word: string): boolean;
  /** 0 = an everyday word, 1 = rare. Drives the score multiplier. */
  rarityOf(word: string): number;
  /**
   * Everyday words only. The board solver uses this rather than the full list:
   * a board whose only solutions are Webster's obscurities is solvable on paper
   * and impossible in practice.
   */
  commonWords: readonly string[];
  /** Letter -> spawn weight, for seeding the board. */
  letterWeights: ReadonlyArray<readonly [string, number]>;
};

/**
 * Compares the nth packed word against `word` without slicing it out.
 *
 * Allocating a substring per probe would mean ~17 throwaway strings per lookup,
 * and lookups happen on every keystroke-equivalent (every tile the player drags
 * through), so this stays allocation-free.
 */
function compareAt(packed: string, index: number, word: string, len: number): number {
  const base = index * len;
  for (let i = 0; i < len; i++) {
    const diff = packed.charCodeAt(base + i) - word.charCodeAt(i);
    if (diff !== 0) return diff;
  }
  return 0;
}

function packedHas(packed: string | undefined, word: string): boolean {
  if (!packed) return false;
  const len = word.length;
  let lo = 0;
  let hi = packed.length / len - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cmp = compareAt(packed, mid, word, len);
    if (cmp === 0) return true;
    if (cmp < 0) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}

/**
 * Candidate lemmas for an inflected form, best guess first.
 *
 * Covers the suffixes a player actually forms on a letter grid: plurals, third
 * person, past tense, gerunds and short comparatives. Each rule is the inverse
 * of a spelling rule — restoring a dropped 'e' (baking -> bake), undoing a
 * doubled consonant (running -> run), and 'ies' -> 'y' (cities -> city).
 */
function lemmas(word: string): string[] {
  const out: string[] = [];
  const add = (w: string) => {
    if (w.length >= 2) out.push(w);
  };

  if (word.endsWith('ies')) {
    add(`${word.slice(0, -3)}y`);
    add(word.slice(0, -1)); // "ie" plurals: pies -> pie
  } else if (word.endsWith('es')) {
    add(word.slice(0, -2)); // boxes -> box
    add(word.slice(0, -1)); // bakes -> bake
  } else if (word.endsWith('s') && !word.endsWith('ss')) {
    add(word.slice(0, -1));
  }

  if (word.endsWith('ed')) {
    // "ied" is usually y -> ied (tried -> try), but not always: "died" is just
    // "die" + d. Both candidates are offered rather than branching, because
    // guessing wrong here silently rejects a perfectly ordinary word.
    if (word.endsWith('ied')) add(`${word.slice(0, -3)}y`);
    add(word.slice(0, -2)); // walked -> walk
    add(word.slice(0, -1)); // baked -> bake
    add(undouble(word.slice(0, -2))); // stopped -> stop
  }

  if (word.endsWith('ing')) {
    const stem = word.slice(0, -3);
    add(stem); // walking -> walk
    add(`${stem}e`); // baking -> bake
    add(undouble(stem)); // running -> run
  }

  if (word.endsWith('er') || word.endsWith('est')) {
    const stem = word.slice(0, word.endsWith('er') ? -2 : -3);
    add(stem);
    add(`${stem}e`);
    add(undouble(stem));
    // happy -> happier drops the y for an i, the same way city -> cities does.
    // Without this the comparative of every -y adjective is rejected.
    if (stem.endsWith('i')) add(`${stem.slice(0, -1)}y`);
  }

  return out;
}

/** "stopp" -> "stop". Only undoes a genuine doubled final consonant. */
function undouble(stem: string): string {
  const n = stem.length;
  if (n >= 3 && stem[n - 1] === stem[n - 2] && !'aeiou'.includes(stem[n - 1])) {
    return stem.slice(0, -1);
  }
  return stem;
}

/**
 * Strips a word to the letters the game deals in.
 *
 * Board tiles are always A-Z, but this also normalises words arriving from the
 * data build, so the same rule decides membership in both places.
 */
export function normalizeWord(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z]/g, '');
}

export function createDictionary(data: DictionaryData): Dictionary {
  // Rank lookup for rarity. ~6k entries, so building it eagerly is cheap —
  // unlike the 76k-entry word list, which is why only this one is hydrated.
  const rankOf = new Map<string, number>();
  data.common.forEach((word, i) => rankOf.set(word, i));

  const letterWeights = Object.entries(data.letters).sort((a, b) => a[0].localeCompare(b[0]));

  /** Direct membership, no morphology. */
  const stored = (word: string): boolean =>
    word.length >= data.minLength &&
    word.length <= data.maxLength &&
    packedHas(data.words[word.length], word);

  function isWord(raw: string): boolean {
    const word = normalizeWord(raw);
    if (word.length < data.minLength || word.length > data.maxLength) return false;
    if (stored(word)) return true;
    // A lemma may be shorter than minLength (cats -> cat is fine, ads -> ad is
    // not), which `stored` rejects on length. That is intentional: two-letter
    // lemmas are too permissive a base to inflect from.
    return lemmas(word).some(stored);
  }

  function rarityOf(raw: string): number {
    const word = normalizeWord(raw);
    const rank = rankOf.get(word);
    if (rank !== undefined) return rank / data.common.length;
    // Valid but outside everyday usage — including inflections of common words,
    // which should not be treated as exotic just because the base form is what
    // carries the rank.
    const lemmaRank = lemmas(word)
      .map((l) => rankOf.get(l))
      .find((r) => r !== undefined);
    if (lemmaRank !== undefined) return lemmaRank / data.common.length;
    return 1;
  }

  return {
    minLength: data.minLength,
    maxLength: data.maxLength,
    isWord,
    rarityOf,
    commonWords: data.common,
    letterWeights,
  };
}
