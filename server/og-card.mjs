/**
 * What a share card IS, as opposed to what it draws.
 *
 * A card has an id, and that id is the whole input to the render. Two things
 * follow from making it a first-class thing rather than a detail of a route.
 *
 *   THE IMAGE URL IS SHORT AND STATIC-LOOKING. `og:image` used to be
 *   `/share/{token}/og.png` — the result payload, in full, nested a level deep
 *   under a dynamic route. The homepage lockup X's composer does unfurl is
 *   `/og-image.png?v=…`, and a card id shortens the gap: a More or Less card
 *   is `m_michael-jackson_albert-einstein`, because two photo ids are
 *   everything that card draws.
 *
 *   ONE RESULT IS ONE CARD, WHATEVER THE LINK LOOKED LIKE. Padded, unpadded
 *   and legacy `~` spellings of a token all decode to the same payload, so
 *   they all produce the same card id — which is also the render cache key, so
 *   they are served the same bytes rather than three different boards.
 *
 * `src/games/more-or-less/card-photos.ts` is the client half of the photo id
 * list. The filter is written twice because this module is plain Node with no
 * TypeScript loader; `src/games/more-or-less/card-photos.test.ts` fails if the
 * two ever disagree.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CATEGORY_PATH = fileURLToPath(
  new URL('../src/data/categories/wikipedia-popularity.json', import.meta.url),
);

/**
 * Licences that carry no attribution requirement. Anything else is credited on
 * screen by `GameScreen` and must not appear on a card that shows no text.
 */
const ATTRIBUTION_FREE = /^(?:public domain|pd|cc0)$/i;

/**
 * Photo id → Wikimedia source URL, in dataset order.
 *
 * The id is the item id without its category prefix: short enough to sit in a
 * share token and in an image path, and stable while the item is in the
 * snapshot. Read at import rather than lazily, because the share document
 * names a card's photos before the pool has necessarily loaded any bytes.
 */
const SOURCES = new Map(
  JSON.parse(readFileSync(CATEGORY_PATH, 'utf-8'))
    .items.filter((item) => item.imageUrl && ATTRIBUTION_FREE.test(item.imageLicense ?? ''))
    .map((item) => [item.id.slice(item.id.indexOf('.') + 1), item.imageUrl]),
);

/** Every photo a card may draw, in dataset order. */
export const CARD_PHOTO_IDS = [...SOURCES.keys()];

// A More or Less card id names two different photos, so a snapshot that cannot
// supply two is a broken card scheme rather than a duller card. Fail here, at
// import, the same way `og-image.mjs` refuses a card slot that has drifted from
// the stored photo size.
if (CARD_PHOTO_IDS.length < 2) {
  throw new Error(
    `The share card needs two attribution-free photographs; the snapshot has ${CARD_PHOTO_IDS.length}`,
  );
}

/** Where a photo id's bytes come from, or `null` for an id we do not know. */
export function cardPhotoSource(id) {
  return SOURCES.get(id) ?? null;
}

/** FNV-1a. The same hash `src/games/more-or-less/card-photos.ts` uses. */
function seedOf(seed) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Two different ids from `ids`, chosen by `seed`, or `null` below two.
 *
 * Used against the full list to name a legacy share's photos, and against the
 * loaded pool to stand in for a photo that never arrived.
 */
export function pickCardPhotoIds(seed, ids = CARD_PHOTO_IDS) {
  if (ids.length < 2) return null;

  const hash = seedOf(seed);
  const top = hash % ids.length;
  // At least 1, so the two slots never name the same photo.
  const step = 1 + (Math.floor(hash / ids.length) % (ids.length - 1));

  return [ids[top], ids[(top + step) % ids.length]];
}

const GAME_LETTERS = { 'more-or-less': 'm', clueless: 'c', wordfall: 'w' };
const GAMES_BY_LETTER = { m: 'more-or-less', c: 'clueless', w: 'wordfall' };

/**
 * Where a card is served, as one definition — the tag the share document
 * declares and the route `serve.mjs` answers cannot drift apart.
 *
 * A card id is base64url plus `_`, so the path a scraper follows is made only
 * of characters `twitter-text` accepts inside a URL and at the end of one.
 */
export const CARD_IMAGE_ROUTE = /^\/og\/share\/([A-Za-z0-9_-]+)\.png$/;

export function cardImagePath(id) {
  return `/og/share/${id}.png`;
}

/**
 * A count the card can draw: a whole number, not a negative, and not large
 * enough to be a way of asking this server to allocate an array of that size.
 * The grids stop at 50 squares; anything past a few thousand is not a run.
 */
function isCount(value, max = 10_000) {
  return Number.isInteger(value) && value >= 0 && value <= max;
}

function hasCounts(buckets, keys) {
  return (
    buckets !== null &&
    typeof buckets === 'object' &&
    keys.every((key) => isCount(buckets[key]))
  );
}

/**
 * True when a decoded payload carries everything its card draws.
 *
 * A share token is whatever a stranger put in a URL, and the renderers read
 * their numbers straight out of it — `Array(data.heatBuckets.cold)` for a grid
 * square per guess. Checked once, here, so every route that can reach a
 * renderer answers 404 to a payload rather than a stack trace.
 */
export function isDrawableShare(data) {
  if (!data || typeof data !== 'object') return false;

  switch (data.game) {
    case 'more-or-less':
      return isCount(data.streak) && isCount(data.bestStreak);
    case 'clueless':
      return (
        isCount(data.puzzleNumber) &&
        isCount(data.guessCount) &&
        (data.levelName === undefined || isDrawableName(data.levelName)) &&
        hasCounts(data.heatBuckets, ['unranked', 'cold', 'top_100', 'top_10', 'win'])
      );
    case 'wordfall':
      return (
        isCount(data.levelNumber) &&
        isCount(data.score, 1_000_000_000) &&
        isCount(data.wordCount) &&
        isDrawableName(data.levelName) &&
        hasCounts(data.lengthBuckets, ['under_3', '3_4', '5_7', '8_plus'])
      );
    default:
      return false;
  }
}

/** A level name is one line on a card, not a payload to rasterise. */
function isDrawableName(name) {
  return typeof name === 'string' && name.length <= 120;
}

/**
 * The two photos a share's card draws.
 *
 * Ids the share named win, as long as we still know them. A share made before
 * 0.8.35 named none, so its pair is derived from the decoded payload — the
 * payload, not the token, so the padded and unpadded spellings of one link
 * cannot disagree about which board they are.
 */
export function cardPhotoIdsFor(shareData) {
  const named = shareData.photos;
  if (
    Array.isArray(named) &&
    named.length === 2 &&
    named.every((id) => SOURCES.has(id)) &&
    named[0] !== named[1]
  ) {
    return [named[0], named[1]];
  }
  return pickCardPhotoIds(JSON.stringify(shareData));
}

/**
 * The id of the card a share result unfurls to, or `null` for a payload no
 * card can be drawn from.
 */
export function cardId(shareData) {
  if (!isDrawableShare(shareData)) return null;

  if (shareData.game === 'more-or-less') {
    const [top, bottom] = cardPhotoIdsFor(shareData);
    return `m_${top}_${bottom}`;
  }

  // Clueless and Wordfall draw their own numbers, so their card is the result.
  // base64url, unpadded: the id sits in a path, and `=` is a character
  // `twitter-text` treats as the end of one.
  const letter = GAME_LETTERS[shareData.game];
  return `${letter}_${Buffer.from(JSON.stringify(shareData), 'utf-8').toString('base64url')}`;
}

/** Everything the renderer needs for a card id, or `null` if it is not one. */
export function cardFromId(id) {
  const separator = id.indexOf('_');
  if (separator === -1) return null;

  const game = GAMES_BY_LETTER[id.slice(0, separator)];
  const rest = id.slice(separator + 1);
  if (!game) return null;

  if (game === 'more-or-less') {
    const [top, bottom, ...extra] = rest.split('_');
    if (extra.length > 0 || !SOURCES.has(top) || !SOURCES.has(bottom) || top === bottom) {
      return null;
    }
    // A More or Less card carries no counters, so the streak that produced it
    // is not part of its identity and does not come back out of the id.
    return { game, streak: 0, bestStreak: 0, photos: [top, bottom] };
  }

  try {
    const data = JSON.parse(Buffer.from(rest, 'base64url').toString('utf-8'));
    return data?.game === game && isDrawableShare(data) ? data : null;
  } catch {
    return null;
  }
}
