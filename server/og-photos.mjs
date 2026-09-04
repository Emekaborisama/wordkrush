/**
 * Card photos for the More or Less share image.
 *
 * The signed share card is the board itself: two live photo cards under MORE /
 * LESS. Those photos live in the bundled category data as
 * `upload.wikimedia.org` URLs, so drawing the card means having image bytes in
 * hand. Two constraints decide the shape of this module.
 *
 *   ATTRIBUTION — CC BY and CC BY-SA oblige us to display a credit, and this
 *   card deliberately carries no text at all. Only items whose licence needs
 *   no credit are eligible, so a wordless card cannot ship a licence breach at
 *   share scale. `GameScreen` still credits every photo it shows on screen.
 *   `og-card.mjs` owns that eligible list; this module owns the bytes.
 *
 *   LATENCY — a scraper fetches a card once and renders whatever comes back. A
 *   Wikimedia round trip inside that request is the difference between a card
 *   and a blank one, so the pool is filled BEFORE the server listens — the
 *   same pre-warming `serve.mjs` already does for the bundle — and serving a
 *   card only ever reads memory.
 *
 * Which pair a card draws is decided by the share, not here: the ids travel in
 * the share token and then in the card id, so one link is one board.
 */
import sharp from 'sharp';

import { CARD_PHOTO_IDS, cardPhotoSource, pickCardPhotoIds } from './og-card.mjs';

/**
 * Stored size of one card photo. Matches the card slot in `og-image.mjs`;
 * change them together or the photo is rescaled a second time on the way out.
 *
 * Two full-width rows inside 1200×630 make this a 4.8:1 slot, which is the
 * shape the signed board has and is not negotiable — see `og-image.mjs`.
 */
export const PHOTO_WIDTH = 1164;
export const PHOTO_HEIGHT = 242;

/**
 * Minimum image entropy for a card photo.
 *
 * A category's lead images are whatever Wikipedia leads with, which is a
 * photograph for a person or a place but a flat vector for a country or a
 * brand. Two national flags stacked is not the board anyone signed off, and
 * the set rotates weekly, so the filter has to be a property of the image
 * rather than a hand-kept list of ids.
 *
 * Measured over the attribution-free set at this slot size: flags and logos
 * land between 0.8 and 2.2, app screenshots at 3.4 and 5.6, and photographs
 * between 6.1 and 7.6. 6 sits in that gap. The margin below it is the thinner
 * side (an app screenshot at 5.6), and the cost of a wrong call there is one
 * cosmetically dull card, not a broken one.
 */
const MIN_PHOTO_ENTROPY = 6;

/** A crawler-facing fetch gets a descriptive agent; Wikimedia blocks generic ones. */
const USER_AGENT = 'WordKrushShareCard/1.0 (https://wordkrush.com; share-card renderer)';

const FETCH_TIMEOUT_MS = 4000;

/** Resized photo bytes, keyed by photo id. Filled by `preloadCardPhotos`. */
const photos = new Map();

/**
 * Crop to the card slot and keep it only if it is a photograph. Returns `null`
 * for a flat graphic so the caller can drop it from the pool.
 */
async function toCardPhoto(bytes) {
  // The slot is a 4.8:1 sliver of a mostly-portrait source, so which band of
  // the frame survives decides whether the photo is recognisable at all.
  // `attention` picks the most salient one, which on a Wikipedia lead portrait
  // is the face. A fixed band does not work: cropping from the top leaves hair
  // and background, and it collapses the entropy separation this filter needs
  // — the Titanic and a blue whale drop to 4.2 and 4.9, below an app
  // screenshot, and photographs stop being distinguishable from flat graphics.
  const cropped = await sharp(bytes)
    .resize(PHOTO_WIDTH, PHOTO_HEIGHT, { fit: 'cover', position: sharp.strategy.attention })
    .toBuffer();

  const { entropy } = await sharp(cropped).stats();
  if (entropy < MIN_PHOTO_ENTROPY) return null;

  return sharp(cropped).jpeg({ quality: 72, mozjpeg: true }).toBuffer();
}

/**
 * Fill the photo pool. Never rejects: a card with no photo still renders, and
 * a Wikimedia outage must not stop the server from starting.
 *
 * `fetchImpl` is injected so the suite can exercise the resize and cache paths
 * without reaching the network.
 */
export async function preloadCardPhotos({
  fetchImpl = fetch,
  timeoutMs = FETCH_TIMEOUT_MS,
} = {}) {
  const results = await Promise.all(
    CARD_PHOTO_IDS.map(async (id) => {
      if (photos.has(id)) return true;
      try {
        const response = await fetchImpl(cardPhotoSource(id), {
          headers: { 'user-agent': USER_AGENT },
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) return false;
        const photo = await toCardPhoto(Buffer.from(await response.arrayBuffer()));
        if (!photo) return false;
        photos.set(id, photo);
        return true;
      } catch {
        return false;
      }
    }),
  );

  return { loaded: results.filter(Boolean).length, eligible: CARD_PHOTO_IDS.length };
}

/** Ids whose bytes are in hand, in dataset order. */
function loadedPhotoIds() {
  // Dataset order, not insertion order: the pool is filled concurrently, so
  // reading the Map directly would hand the same link a different board on
  // every restart depending on which fetch returned first.
  return CARD_PHOTO_IDS.filter((id) => photos.has(id));
}

/**
 * The two photos a card draws, or `null` while the pool is cold. The caller
 * draws the board either way.
 *
 * `photoIds` is the pair the card id named. A photo the pool never loaded —
 * dropped by the entropy filter, or a Wikimedia fetch that failed — falls back
 * to a seeded stand-in rather than an empty slot, and the two slots are always
 * different photos.
 */
export function cardPhotoPair(seed, photoIds = []) {
  const loaded = loadedPhotoIds();
  if (loaded.length < 2) return null;

  const [seededTop, seededBottom] = pickCardPhotoIds(seed, loaded);
  const top = loaded.includes(photoIds[0]) ? photoIds[0] : seededTop;
  const wanted = loaded.includes(photoIds[1]) ? photoIds[1] : seededBottom;
  const bottom = wanted === top ? loaded[(loaded.indexOf(top) + 1) % loaded.length] : wanted;

  return { top: photos.get(top), bottom: photos.get(bottom) };
}

/** Test seam: drop the pool so a suite can assert the cold-start render. */
export function resetCardPhotos() {
  photos.clear();
}
