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

async function meanOf(png, region) {
  const { channels } = await sharp(png).extract(region).stats();
  return channels.slice(0, 3).reduce((total, channel) => total + channel.mean, 0) / 3;
}

afterEach(() => {
  resetCardPhotos();
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

  it('rasterises those photos into the slots rather than leaving them empty', async () => {
    let nth = 0;
    await preloadCardPhotos({ fetchImpl: fetchServing(() => photoLike(++nth * 7919)) });

    const png = await generateOgImagePng(RESULT, 'two-photos');
    const means = await Promise.all(MORE_OR_LESS_CARD_SLOTS.map((slot) => meanOf(png, slot)));

    // An empty slot is `theme.card` (#1A1732, mean ~34) on a #0A0817 page.
    // Anything drawn into it and scrimmed sits well above that.
    for (const mean of means) expect(mean).toBeGreaterThan(60);
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

  it('stores photos at the card slot size', async () => {
    await preloadCardPhotos({ fetchImpl: fetchServing((url) => photoLike(url.length)) });
    const pair = cardPhotoPair('sized');

    for (const photo of [pair.left, pair.right]) {
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

    expect(second.left.equals(first.left)).toBe(true);
    expect(second.right.equals(first.right)).toBe(true);
  });

  it('never draws the same photo into both slots', async () => {
    let nth = 0;
    await preloadCardPhotos({ fetchImpl: fetchServing(() => photoLike(++nth * 7919)) });

    for (const id of ['a', 'bb', 'ccc', 'dddd', 'eeeee', 'ffffff', 'ggggggg']) {
      const pair = cardPhotoPair(id);
      expect(pair.left.equals(pair.right)).toBe(false);
    }
  });
});
