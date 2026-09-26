/**
 * The photos a More or Less share card is allowed to draw.
 *
 * The card is the board: two full-bleed photographs above MORE and LESS. Those
 * photographs come from the bundled category snapshot, and which two a share
 * draws is decided HERE, by the client, at the moment the player shares —
 * `server/og-card.mjs` keeps the matching list and resolves the ids back to
 * image bytes.
 *
 * Deciding it client-side is the point. The server used to pick the pair by
 * hashing the encoded share token, which made the art a property of how the
 * link happened to be spelled: the same result reached one scraper padded and
 * the next unpadded, and the two drew different boards. An id in the payload
 * survives every spelling of the token.
 *
 * ATTRIBUTION — CC BY and CC BY-SA oblige us to display a credit and this card
 * carries no text at all, so only licences that need no credit are eligible.
 * The filter is duplicated in `server/og-card.mjs` because that module is
 * plain Node with no TypeScript loader; `card-photos.test.ts` fails if the two
 * lists ever disagree.
 */
import category from '../../data/categories/wikipedia-popularity.json';

/** Licences that carry no attribution requirement. */
const ATTRIBUTION_FREE = /^(?:public domain|pd|cc0)$/i;

/**
 * A photo id is the item id without its category prefix — short enough to sit
 * in a share token and in an image path, and stable while the item is in the
 * dataset. The pool is one category, so the prefix carries no information.
 */
function photoId(itemId: string): string {
  return itemId.slice(itemId.indexOf('.') + 1);
}

/** Every photo a card may draw, in dataset order. */
export const CARD_PHOTO_IDS: readonly string[] = category.items
  .filter((item) => item.imageUrl && ATTRIBUTION_FREE.test(item.imageLicense ?? ''))
  .map((item) => photoId(item.id));

/** FNV-1a. Small, dependency-free, and the same hash `server/og-card.mjs` uses. */
function seedOf(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Two different photo ids for a seed, or `null` if fewer than two are eligible.
 *
 * Seeded rather than random so a share is a pure function of the run that
 * produced it: the same result pastes the same link, and a suite can assert
 * what it drew.
 */
export function pickCardPhotos(seed: string): [string, string] | null {
  if (CARD_PHOTO_IDS.length < 2) return null;

  const hash = seedOf(seed);
  const top = hash % CARD_PHOTO_IDS.length;
  // At least 1, so the two slots never name the same photo.
  const step = 1 + (Math.floor(hash / CARD_PHOTO_IDS.length) % (CARD_PHOTO_IDS.length - 1));

  return [CARD_PHOTO_IDS[top], CARD_PHOTO_IDS[(top + step) % CARD_PHOTO_IDS.length]];
}
