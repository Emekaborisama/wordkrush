/**
 * Card art coverage.
 *
 * `serve.test.mjs` owns the response contract — status codes, headers, tags.
 * This suite owns what is actually drawn: that the More or Less card is the
 * board and nothing else, that a photo reaches both slots, and that the pool
 * only admits photographs it is allowed to show uncredited.
 *
 * No network. The pool takes an injected `fetchImpl`, so the fetch, crop,
 * entropy and cache paths run against images built here.
 */
import { afterEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';

import {
  MORE_OR_LESS_BUTTON_SLOTS,
  MORE_OR_LESS_CARD_SLOTS,
  generateOgImagePng,
  generateOgImageSvg,
} from './og-image.mjs';
import { CARD_PHOTO_IDS, cardPhotoSource } from './og-card.mjs';
import {
  PHOTO_HEIGHT,
  PHOTO_WIDTH,
  cardPhotoPair,
  preloadCardPhotos,
  resetCardPhotos,
} from './og-photos.mjs';

/** Deterministic RGB noise — a stand-in for a photograph's entropy. */
async function photoLike(seed) {
  const width = 240;
  const height = 240;
  const pixels = Buffer.alloc(width * height * 3);
  let state = seed >>> 0 || 1;
  for (let i = 0; i < pixels.length; i++) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    pixels[i] = state >>> 24;
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

/** A flag or a logo: large flat fields, almost no entropy. */
async function flagLike() {
  return sharp({
    create: { width: 240, height: 240, channels: 3, background: '#B01030' },
  })
    .png()
    .toBuffer();
}

function fetchServing(bodyFor) {
  return async (url) => {
    const body = await bodyFor(url);
    if (!body) return { ok: false, arrayBuffer: async () => new ArrayBuffer(0) };
    return { ok: true, arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) };
  };
}

const RESULT = { game: 'more-or-less', streak: 7, bestStreak: 12 };

/** Which photo id a pool fetch is for, so a suite can serve one image per id. */
const ID_BY_SOURCE = new Map(CARD_PHOTO_IDS.map((id) => [cardPhotoSource(id), id]));

/** A different, stable image per photo id, whatever order the pool filled in. */
function fetchOnePhotoPerId() {
  return fetchServing((url) => {
    const id = ID_BY_SOURCE.get(url);
    return photoLike(CARD_PHOTO_IDS.indexOf(id) * 7919 + 1);
  });
}

/**
 * Every word the card draws, in order.
 *
 * Assertions have to read the text nodes rather than the SVG source: the
 * document opens with an XML declaration and carries base64 photo payloads, so
 * searching the whole string for a stray `?` or the word "best" matches noise.
 */
function drawnText(svg) {
  return [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((match) => match[1]);
}

/**
 * The PNG's own IHDR header, read from the bytes.
 *
 * `sharp().metadata()` reports three channels for an indexed card as readily
 * as for a truecolour one, so "is this paletted?" cannot be asked through a
 * decoder — it is a property of the encoded file. IHDR is the first chunk
 * after the 8-byte signature and has a fixed layout, so the fields are read
 * where the format puts them.
 */
function ihdr(png) {
  expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR');

  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    bitDepth: png.readUInt8(24),
    colorType: png.readUInt8(25),
  };
}

/**
 * Statistics for one region of a rendered card.
 *
 * The crop is materialised before `stats()` because `stats()` reads its input
 * and ignores queued operations — chaining `.extract(...).stats()` silently
 * measures the whole 1200×630 card instead of the region asked for.
 */
async function regionStats(png, region) {
  const crop = await sharp(png).extract(region).png().toBuffer();
  const { channels } = await sharp(crop).stats();
  const rgb = channels.slice(0, 3);
  return {
    mean: rgb.reduce((total, channel) => total + channel.mean, 0) / 3,
    maxStdev: Math.max(...rgb.map((channel) => channel.stdev)),
  };
}

afterEach(() => {
  resetCardPhotos();
});

describe('the More or Less board layout', () => {
  it('stacks the two photo cards, one above the other', () => {
    const [top, bottom] = MORE_OR_LESS_CARD_SLOTS;

    // The signed board is stacked, as the phone plays it. Side by side was
    // rejected: it is a different board, whatever it does for the crop.
    expect(bottom.left).toBe(top.left);
    expect(bottom.top).toBeGreaterThan(top.top + top.height);
    expect(top.width).toBe(bottom.width);
    expect(top.height).toBe(bottom.height);
  });

  it('runs each photo card full-bleed across the card', () => {
    const [top] = MORE_OR_LESS_CARD_SLOTS;
    const margin = top.left;

    expect(top.width).toBe(1200 - margin * 2);
    expect(margin).toBeLessThanOrEqual(24);
    // Stacking two full-width rows is what makes each slot a wide sliver.
    // Asserted, not lamented: it is the shape of the board that was signed.
    expect(top.width / top.height).toBeGreaterThan(4);
  });

  it('puts MORE and LESS side by side underneath both photo cards', () => {
    const [, bottomCard] = MORE_OR_LESS_CARD_SLOTS;
    const [more, less] = MORE_OR_LESS_BUTTON_SLOTS;

    expect(more.top).toBeGreaterThanOrEqual(bottomCard.top + bottomCard.height);
    expect(less.top).toBe(more.top);
    expect(less.left).toBeGreaterThan(more.left + more.width);
    expect(more.top + more.height).toBeLessThanOrEqual(630);
  });
});

describe('the More or Less card', () => {
  it('is the board: two photo cards, the two buttons, and no other words', async () => {
    await preloadCardPhotos({ fetchImpl: fetchServing((url) => photoLike(url.length)) });
    const svg = generateOgImageSvg(RESULT, 'a-board');

    expect(svg.match(/<image /g)).toHaveLength(2);
    // The only words on the card. Not a title, not an item name, not a value,
    // not `? ? ?`, and none of the STREAK / BEST / SEEN pills the board wears.
    expect(drawnText(svg)).toEqual(['More', 'Less']);
  });

  it('carries no streak, best or count — the same board whatever the run scored', async () => {
    await preloadCardPhotos({ fetchImpl: fetchServing((url) => photoLike(url.length)) });

    const gutted = generateOgImageSvg(
      { game: 'more-or-less', streak: 0, bestStreak: 0 },
      'same-link',
    );
    const long = generateOgImageSvg(
      { game: 'more-or-less', streak: 35, bestStreak: 120 },
      'same-link',
    );

    // A card that drew a counter anywhere could not survive the streak going
    // from 0 to 35 unchanged. The standing lives in the paste line instead.
    expect(long).toBe(gutted);
  });

  it('draws a different photo into each card slot', async () => {
    let nth = 0;
    await preloadCardPhotos({ fetchImpl: fetchServing(() => photoLike(++nth * 7919)) });

    const svg = generateOgImageSvg(RESULT, 'two-photos');
    const embedded = [...svg.matchAll(/xlink:href="data:image\/jpeg;base64,([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(embedded).toHaveLength(2);
    expect(embedded[0]).not.toBe(embedded[1]);
  });

  it('rasterises those photos into both stacked slots rather than leaving them empty', async () => {
    let nth = 0;
    await preloadCardPhotos({ fetchImpl: fetchServing(() => photoLike(++nth * 7919)) });

    const png = await generateOgImagePng(RESULT, 'two-photos');
    const slots = await Promise.all(
      MORE_OR_LESS_CARD_SLOTS.map((slot) => regionStats(png, slot)),
    );

    // An empty slot is `theme.card` (#1A1732, mean ~34) on a #0A0817 page.
    // Anything drawn into it and scrimmed sits well above that.
    for (const { mean } of slots) expect(mean).toBeGreaterThan(60);
  });

  it('keeps the MORE and LESS fills flat', async () => {
    await preloadCardPhotos({ fetchImpl: fetchServing((url) => photoLike(url.length)) });
    const png = await generateOgImagePng(RESULT, 'flat-buttons');

    // The tonal LESS button is a translucent fill over a flat page, and the
    // palette encode this card used to ship approximated it — dithered, into
    // large structured blotches that read as a rendering fault on one of the
    // two elements the card exists to show. Truecolour has no quantiser to
    // approximate anything, but the requirement is the render, not the
    // encoder: sampled clear of the rounded corners, the arrow and the label,
    // a button fill has to have no variance at all.
    for (const slot of MORE_OR_LESS_BUTTON_SLOTS) {
      const { maxStdev } = await regionStats(png, {
        left: slot.left + 40,
        top: slot.top + 30,
        width: 140,
        height: 26,
      });
      expect(maxStdev).toBeLessThan(0.5);
    }
  });

  it('still draws the board at 1200×630 when the pool is cold', async () => {
    const png = await generateOgImagePng(RESULT, 'cold-pool');
    const { width, height } = await sharp(png).metadata();

    expect(cardPhotoPair('cold-pool')).toBeNull();
    expect([width, height]).toEqual([1200, 630]);
  });

  it('renders the button arrows as shapes, so a missing glyph cannot become tofu', () => {
    // Fredoka has no U+2191 / U+2193. Setting them as text is what turned the
    // grid emoji into .notdef boxes, so the button arrows are polygons.
    const svg = generateOgImageSvg(RESULT, 'arrows');

    expect(svg).not.toMatch(/[\u2191\u2193]/);
    expect(svg.match(/<polygon /g)).toHaveLength(2);
  });
});

/**
 * How the card is encoded, as opposed to what it draws.
 *
 * X's composer would not build a card from the indexed render this card used
 * to ship — the share HTML and the PNG both answered 200 to Twitterbot, the
 * composer span 42 seconds and produced nothing — while the truecolour
 * homepage lockup unfurled from the same account. Colour type is therefore a
 * shipped property of the card, not an encoder detail, and it is asserted on
 * the bytes.
 */
describe('the card PNG', () => {
  const CARDS = {
    'more-or-less': RESULT,
    clueless: {
      game: 'clueless',
      puzzleNumber: 29,
      levelName: 'Departure Board',
      guessCount: 4,
      heatBuckets: { unranked: 1, cold: 1, top_100: 1, top_10: 0, win: 1 },
    },
    wordfall: {
      game: 'wordfall',
      levelNumber: 6,
      levelName: 'Tide Line',
      score: 4820,
      wordCount: 9,
      lengthBuckets: { under_3: 0, '3_4': 4, '5_7': 4, '8_plus': 1 },
      won: true,
    },
  };

  it.each(Object.keys(CARDS))('encodes %s as 8-bit truecolour RGB at 1200×630', async (game) => {
    await preloadCardPhotos({ fetchImpl: fetchServing((url) => photoLike(url.length)) });
    const png = await generateOgImagePng(CARDS[game], `truecolour-${game}`);

    // PNG colour type 2. Not 3 (indexed), which is the render X refused; not
    // 0 or 4 (greyscale); not 6, which would ship an alpha channel the card
    // never varies. Bit depth 8, so "truecolour" is not 16-bit either.
    expect(ihdr(png)).toEqual({ width: 1200, height: 630, bitDepth: 8, colorType: 2 });
  });

  it('stays truecolour when the photo pool is cold', async () => {
    // A cold pool draws flat surfaces, which is exactly the card a quantiser
    // would be cheapest on. The encode must not depend on what was drawn.
    const png = await generateOgImagePng(RESULT, 'cold-truecolour');

    expect(cardPhotoPair('cold-truecolour')).toBeNull();
    expect(ihdr(png).colorType).toBe(2);
  });
});

/**
 * Which two photographs a card draws.
 *
 * This used to be a hash of the encoded share token, which made the board a
 * property of how the link happened to be spelled: X's composer strips a
 * token's trailing padding, so the card it fetched was drawn from a different
 * hash than the one the player saw. The pair is named in the card id now, and
 * that id is the only thing the render reads.
 */
describe('the photos a card is told to draw', () => {
  it('are the ones the card id named, in the order it named them', async () => {
    await preloadCardPhotos({ fetchImpl: fetchOnePhotoPerId() });
    const [a, b] = ['blue-whale', 'mona-lisa'];

    const named = cardPhotoPair('m_blue-whale_mona-lisa', [a, b]);
    const swapped = cardPhotoPair('m_mona-lisa_blue-whale', [b, a]);

    expect(named.top.equals(swapped.bottom)).toBe(true);
    expect(named.bottom.equals(swapped.top)).toBe(true);
    expect(named.top.equals(named.bottom)).toBe(false);
  });

  it('do not change when the seed does', async () => {
    await preloadCardPhotos({ fetchImpl: fetchOnePhotoPerId() });
    const photos = ['japan', 'titanic'];

    const first = cardPhotoPair('one-spelling', photos);
    const second = cardPhotoPair('a-completely-different-string', photos);

    expect(second.top.equals(first.top)).toBe(true);
    expect(second.bottom.equals(first.bottom)).toBe(true);
  });

  it('reach the rendered card, not just the pair helper', async () => {
    await preloadCardPhotos({ fetchImpl: fetchOnePhotoPerId() });
    const photos = ['egypt', 'spotify'];

    const svg = generateOgImageSvg({ ...RESULT, photos }, 'm_egypt_spotify');
    const embedded = [...svg.matchAll(/xlink:href="data:image\/jpeg;base64,([^"]+)"/g)].map(
      (match) => match[1],
    );
    const pair = cardPhotoPair('m_egypt_spotify', photos);

    expect(embedded).toEqual([pair.top.toString('base64'), pair.bottom.toString('base64')]);
  });

  it('stand in for a photo the pool never loaded rather than leaving a hole', async () => {
    // The pool drops flat graphics and tolerates a Wikimedia fetch that fails,
    // so an id a share named is not always an id there are bytes for.
    await preloadCardPhotos({ fetchImpl: fetchOnePhotoPerId() });

    const pair = cardPhotoPair('m_gone_titanic', ['not-in-the-pool', 'titanic']);
    const again = cardPhotoPair('m_gone_titanic', ['not-in-the-pool', 'titanic']);

    expect(pair.top).toBeInstanceOf(Buffer);
    expect(pair.top.equals(pair.bottom)).toBe(false);
    expect(again.top.equals(pair.top)).toBe(true);
  });
});

describe('the card photo pool', () => {
  it('keeps photographs and drops flat graphics', async () => {
    const flat = await flagLike();
    let nth = 0;
    const pool = await preloadCardPhotos({
      fetchImpl: fetchServing(() => (++nth % 2 === 0 ? flat : photoLike(nth * 104729))),
    });

    expect(pool.eligible).toBeGreaterThan(2);
    expect(pool.loaded).toBeGreaterThan(0);
    expect(pool.loaded).toBeLessThan(pool.eligible);
  });

  it('tolerates a source that will not load', async () => {
    const pool = await preloadCardPhotos({
      fetchImpl: async () => {
        throw new Error('wikimedia unreachable');
      },
    });

    expect(pool.loaded).toBe(0);
    expect(cardPhotoPair('anything')).toBeNull();
  });

  it('stores photos at the stacked card slot size', async () => {
    await preloadCardPhotos({ fetchImpl: fetchServing((url) => photoLike(url.length)) });
    const pair = cardPhotoPair('sized');
    const [slot] = MORE_OR_LESS_CARD_SLOTS;

    // The pool crops to the slot exactly, so nothing is rescaled a second time
    // on the way out. Drift between the two modules is a boot-time throw.
    expect([PHOTO_WIDTH, PHOTO_HEIGHT]).toEqual([slot.width, slot.height]);
    for (const photo of [pair.top, pair.bottom]) {
      const { width, height } = await sharp(photo).metadata();
      expect([width, height]).toEqual([PHOTO_WIDTH, PHOTO_HEIGHT]);
    }
  });

  it('gives one share id the same pair however the pool filled', async () => {
    // The pool is filled concurrently, so reading it in insertion order would
    // hand the same link a different board after a restart.
    const ordered = fetchServing((url) => photoLike(url.length));
    const reversed = async (url) => {
      await new Promise((resolve) => setTimeout(resolve, url.length % 5));
      return ordered(url);
    };

    await preloadCardPhotos({ fetchImpl: ordered });
    const first = cardPhotoPair('stable-link');
    resetCardPhotos();
    await preloadCardPhotos({ fetchImpl: reversed });
    const second = cardPhotoPair('stable-link');

    expect(second.top.equals(first.top)).toBe(true);
    expect(second.bottom.equals(first.bottom)).toBe(true);
  });

  it('never draws the same photo into both slots', async () => {
    let nth = 0;
    await preloadCardPhotos({ fetchImpl: fetchServing(() => photoLike(++nth * 7919)) });

    for (const id of ['a', 'bb', 'ccc', 'dddd', 'eeeee', 'ffffff', 'ggggggg']) {
      const pair = cardPhotoPair(id);
      expect(pair.top.equals(pair.bottom)).toBe(false);
    }
  });
});
