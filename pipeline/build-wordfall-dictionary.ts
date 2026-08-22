/**
 * Builds the Wordfall dictionary.
 *
 *     npm run pipeline:wordfall
 *
 * Wordfall needs two different word lists, and conflating them breaks the game
 * in opposite directions:
 *
 *   words  — what the game accepts. Needs high recall, because rejecting a word
 *            the player knows is the worst thing a word game can do. Accepting
 *            an obscure one is a minor sin by comparison.
 *
 *   common — frequency-ordered everyday words. Used for the two jobs the full
 *            list cannot do: scoring rarity, and certifying that a generated
 *            board is playable. If the board solver counted Webster's
 *            obscurities it would happily certify boards whose only solutions
 *            are "aalii" and "abaft" — solvable on paper, impossible in a game.
 *
 * INFLECTIONS ARE NOT STORED. An earlier build generated every plural, past
 * tense and gerund up front and cost 995 KB. `createDictionary` derives them by
 * suffix-stripping at lookup time instead, for 40% of the bundle and better
 * recall than any generated list. This script imports those same rules so the
 * committed `common` list matches exactly what the app will accept.
 *
 * SOURCES AND RIGHTS
 *
 *   /usr/share/dict/web2 — Webster's Revised Unabridged Dictionary (1913),
 *   public domain, shipped with macOS/BSD. Good validity, but it predates the
 *   modern lexicon and lists lemmas only.
 *
 *   src/data/clueless/vocab.json — the frequency-ordered list already bundled
 *   for Clueless, reused rather than duplicated. It is web-derived, so it
 *   carries junk ("www", "href", "mediawiki") and proper nouns ("texas",
 *   "january"); intersecting it with the dictionary filters those out, since
 *   none of them are dictionary words.
 *
 * This script reads local system files, so it runs on the author's machine and
 * its OUTPUT IS COMMITTED — CI never regenerates it. Same arrangement as the
 * Clueless puzzle build.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createDictionary, type DictionaryData } from '../src/games/wordfall/dictionary';

const OUT_DIR = fileURLToPath(new URL('../src/data/wordfall/', import.meta.url));
const VOCAB = fileURLToPath(new URL('../src/data/clueless/vocab.json', import.meta.url));
const SYSTEM_WORDS = process.env.WORDS ?? '/usr/share/dict/web2';

/**
 * Word length bounds.
 *
 * Three is the shortest word worth forming. Eight is the practical ceiling: on
 * a 7x8 board an eight-tile path is already a rare find, and every extra band
 * costs bundle size for words nobody will ever trace.
 */
const MIN_LEN = 3;
const MAX_LEN = 8;

const IN_RANGE = new RegExp(`^[a-z]{${MIN_LEN},${MAX_LEN}}$`);

/**
 * The most frequent words in English, roughly in frequency order.
 *
 * This list does two jobs. It patches validity gaps, and — more importantly —
 * it fixes rarity. The bundled vocab is a web-frequency list with stopwords
 * stripped, so without this "the" would rank as rare and pay the maximum score
 * multiplier, making THE-spamming the optimal strategy. These words are
 * prepended to `common`, so the game's most ordinary words score as such.
 *
 * Only words of MIN_LEN..MAX_LEN are useful here; shorter ones cannot be
 * played on the board at all.
 */
const CORE = `
the and that for was with you this but his from they say her she will one all
would there their what out about who get which when make can like time just
him know take people into year your good some could them see other than then
now look only come its over think also back after use two how our work first
well way even new want because any these give day most has had were been are
did made said went more very much many such own off put end why ask men run
try still last might great same tell does got high every left find long down
need feel three state never become between help talk where turn start show
hear play move live believe hold bring happen write sit lose pay meet include
continue set learn change lead watch follow stop create speak read spend grow
open walk win teach offer remember consider appear buy wait serve die send
expect build stay fall cut reach keep begin seem let put head hand part place
case week point government company number group problem fact
`
  .split(/\s+/)
  .filter(Boolean);

/**
 * Ordinary words Webster's 1913 simply does not list, plus the modern lexicon
 * it could not have known.
 *
 * The gaps are not random: web2 lists lemmas, so irregular forms ("held",
 * "women", "feet", "paid") are absent, and a handful of everyday nouns ("box")
 * are missing outright. Curated from the words the frequency vocab contained
 * but the dictionary rejected, filtered by hand to exclude the proper nouns and
 * abbreviations that make up the rest of that list.
 *
 * Regular inflections of these come free from the lookup rules.
 */
const ADDITIONS = `
box held women feet paid heard began became blew has teeth geese mice
database centre catalog theatre desktop homepage mini multi stats bytes
mom max demo euro okay cafe analog cookie intro licence metro airline modem
app blog email online website internet web download upload video digital
laptop wifi emoji selfie podcast username password login logout
info software hardware webcam browser server offline update upgrade
taco sushi burrito latte bagel movie soda snack teen jean plugin avatar
`
  .split(/\s+/)
  .filter(Boolean);

/** Load the system dictionary, keeping only plain lowercase words in range. */
function loadSystemWords(): string[] {
  let raw: string;
  try {
    raw = readFileSync(SYSTEM_WORDS, 'utf8');
  } catch {
    throw new Error(
      `Could not read ${SYSTEM_WORDS}. On macOS/BSD this ships at /usr/share/dict/web2.\n` +
        `Point WORDS= at a plain newline-delimited word list to build elsewhere.`,
    );
  }
  // Capitalised entries are proper nouns; entries with punctuation are
  // multi-word or hyphenated forms that cannot be traced on a letter grid.
  return raw.split('\n').filter((w) => IN_RANGE.test(w));
}

/**
 * Packs a word set as one concatenated string per length.
 *
 * A JSON array spends four bytes of quotes and commas on every five-byte word.
 * Fixed-width packing spends none, and the sort it requires is what lets the
 * runtime binary-search the string instead of hydrating a Set.
 */
function pack(words: Set<string>): Record<string, string> {
  const byLength = new Map<number, string[]>();
  for (const w of words) {
    const bucket = byLength.get(w.length);
    if (bucket) bucket.push(w);
    else byLength.set(w.length, [w]);
  }
  const packed: Record<string, string> = {};
  for (const [len, list] of [...byLength].sort((a, b) => a[0] - b[0])) {
    // Sorted because lookup binary-searches it — and as a side benefit the
    // committed file stays stable across rebuilds, so diffs mean something.
    packed[String(len)] = list.sort().join('');
  }
  return packed;
}

/**
 * Letter spawn weights, measured from the words players actually form.
 *
 * A uniform or hand-tuned distribution produces boards that look like letters
 * but contain no words. Deriving the weights from `common` stocks the board in
 * the proportions the target vocabulary actually uses.
 *
 * Counted per DISTINCT word rather than per occurrence, so a handful of very
 * frequent words cannot skew the whole board toward their letters.
 */
function letterWeights(common: string[]): Record<string, number> {
  const counts = new Map<string, number>();
  for (const word of common) {
    for (const ch of new Set(word)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const weights: Record<string, number> = {};
  for (const [ch, n] of [...counts].sort()) {
    // Per-mille integers: precise enough to shape a board, and they survive a
    // JSON round trip without float drift.
    weights[ch] = Math.max(1, Math.round((n / total) * 1000));
  }
  return weights;
}

function main() {
  const system = loadSystemWords();
  console.log(`system dictionary: ${system.length.toLocaleString()} words (${MIN_LEN}-${MAX_LEN})`);

  const vocabRaw: string[] = JSON.parse(readFileSync(VOCAB, 'utf8'));
  const vocab = vocabRaw.filter((w) => IN_RANGE.test(w));
  console.log(`frequency vocab:   ${vocab.length.toLocaleString()} words in range`);

  const words = new Set<string>(system);
  for (const w of [...CORE, ...ADDITIONS]) if (IN_RANGE.test(w)) words.add(w);

  // Build a dictionary over the words alone, then use ITS rules to decide which
  // vocab entries survive. Doing the filtering here by hand would let the
  // committed `common` list drift from what the app actually accepts.
  const packed = pack(words);
  const probe = createDictionary({
    minLength: MIN_LEN,
    maxLength: MAX_LEN,
    letters: {},
    common: [],
    words: packed,
  });

  // The intersection is what discards "www", "href", "texas" and "january":
  // none of them survive contact with a dictionary. Inflections like "services"
  // and "books" survive via suffix-stripping, exactly as they will in game.
  //
  // CORE goes first because it is ordered by true English frequency, while the
  // vocab is ordered by frequency *on the web* — which is why it ranks "email"
  // above "water". Where the two overlap, the CORE position wins.
  const common = [...CORE.filter((w) => IN_RANGE.test(w)), ...vocab.filter((w) => probe.isWord(w))]
    .filter((w, i, all) => all.indexOf(w) === i);
  console.log(
    `common words:      ${common.length.toLocaleString()} ` +
      `(dropped ${(vocab.length - common.length).toLocaleString()} non-dictionary entries)`,
  );
  console.log(`stored words:      ${words.size.toLocaleString()} (inflections derived at lookup)`);

  const payload: DictionaryData & Record<string, unknown> = {
    _readme:
      'Generated by pipeline/build-wordfall-dictionary.ts. Do not hand-edit. ' +
      'words: valid words packed as one sorted fixed-width string per length; ' +
      'inflections are NOT stored, they are derived by src/games/wordfall/dictionary.ts. ' +
      'common: everyday words, most frequent first — index is the rarity rank. ' +
      'letters: per-mille spawn weights measured from `common`.',
    source:
      'Webster’s Revised Unabridged Dictionary (1913, public domain) + bundled frequency vocab',
    builtAt: new Date().toISOString().slice(0, 10),
    minLength: MIN_LEN,
    maxLength: MAX_LEN,
    letters: letterWeights(common),
    common,
    words: packed,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const out = `${OUT_DIR}dictionary.json`;
  writeFileSync(out, JSON.stringify(payload));
  console.log(`\nwrote ${out} (${(readFileSync(out).length / 1024).toFixed(0)} KB)`);
}

main();
