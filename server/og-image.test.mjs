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

    // The palette quantiser spends its 256 entries on the photographs, so the
    // tonal button's translucent fill gets approximated — and dithered, that
    // approximation is large structured blotches, a chevron across the button
    // that reads as a rendering fault. Sampled clear of the rounded corners,
    // the arrow and the label, a button fill has to have no variance at all.
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
