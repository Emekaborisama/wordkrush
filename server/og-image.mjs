/**
 * Server-side OG image generation for share links.
 *
 * Generates 1200×630 spoiler-free Open Graph images as PNG (X/Twitter requires
 * rasterized images, not SVG). The images never carry answers, guessed words,
 * or item labels.
 *
 * More or Less draws the board a player just left: two photo cards above MORE
 * and LESS, and nothing else. A share card is an advertisement for the game, so
 * it has to look like the game — a scoreboard of counters reads as a generic
 * stats blob at timeline size, and the streak already has a home in the paste
 * line above the link. Clueless and Wordfall still draw their result grid.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { PHOTO_HEIGHT, PHOTO_WIDTH, cardPhotoPair } from './og-photos.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WIDTH = 1200;
const HEIGHT = 630;
const BG_COLOR = '#0A0817'; // brand.ink
const TEXT_COLOR = '#F4F0FF'; // brand.text
const ACCENT_COLOR = '#E8B840'; // brand.krush

/**
 * Board geometry for the More or Less card, and the tokens it borrows from
 * `src/ui/theme.ts` / `src/games/registry.ts`.
 *
 * The board is STACKED, as the phone plays it and as the signed crop shows it:
 * one full-width photo card above another, MORE and LESS underneath. The
 * measurements here trace that crop — cards ending around y=260 and y=514 on a
 * 1200×630 ground, an ~86px button row beneath them.
 *
 * That makes each photo slot 4.8:1, and cropping a mostly-portrait Wikipedia
 * lead image that flat costs real detail. It is an accepted cost, not a
 * trade-off to reopen: the stacked pair is the product bar. `og-photos.mjs`
 * spends its crop budget on keeping the subject in the band that survives.
 *
 * `CARD_W` / `CARD_H` are the photo size in `og-photos.mjs`; change them
 * together or a card photo is rescaled a second time on the way out.
 */
const BOARD = {
  pad: 18,
  gap: 12,
  cardRadius: 28,
  buttonHeight: 86,
  buttonRadius: 28,
  /** `theme.bg` — dark-on-bright label for the filled button. */
  ink: '#0A0817',
  /** `theme.text`. */
  label: '#FFF9F6',
  /** `registry` accent for More or Less. */
  more: '#32E487',
  /** `theme.accentSecondary`, drawn tonal exactly as `Button` does. */
  less: '#8B6BFF',
  /** `theme.edge` — the hairline that stops a dark card reading as a hole. */
  edge: 'rgba(255,255,255,0.10)',
  /** `GameScreen`'s flat card scrim. No bottom band: this card carries no text. */
  scrim: 'rgba(8,6,20,0.34)',
  /** `theme.card` — the surface a card keeps when it has no photo. */
  surface: '#1A1732',
};

const CARD_W = WIDTH - BOARD.pad * 2;
const CARD_H = Math.round((HEIGHT - BOARD.pad * 2 - BOARD.buttonHeight - BOARD.gap * 2) / 2);
const BUTTON_W = Math.round((CARD_W - BOARD.gap) / 2);

// Copy Fredoka font to a location fontconfig can find
// librsvg (used by sharp for SVG) doesn't support data URI fonts in @font-face
const FREDOKA_SRC = join(
  __dirname,
  '../node_modules/@expo-google-fonts/fredoka/600SemiBold/Fredoka_600SemiBold.ttf',
);
const FONT_DIR = join(tmpdir(), 'wordkrush-fonts');
const FREDOKA_PATH = join(FONT_DIR, 'Fredoka-SemiBold.ttf');

// Ensure font is installed for fontconfig/pango
try {
  mkdirSync(FONT_DIR, { recursive: true });
  if (!readFileSync(FREDOKA_PATH, { flag: 'r' }).length) throw new Error('copy');
} catch {
  const font = readFileSync(FREDOKA_SRC);
  writeFileSync(FREDOKA_PATH, font);
}

// Create fontconfig configuration
const FONTCONFIG_FILE = join(FONT_DIR, 'fonts.conf');
const fontconfigXml = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${FONT_DIR}</dir>
  <cachedir>${FONT_DIR}/cache</cachedir>
</fontconfig>`;
try {
  if (!readFileSync(FONTCONFIG_FILE, { encoding: 'utf-8' }).includes(FONT_DIR)) throw new Error('write');
} catch {
  writeFileSync(FONTCONFIG_FILE, fontconfigXml);
}

// Set environment variable for fontconfig
process.env.FONTCONFIG_FILE = FONTCONFIG_FILE;

if (CARD_W !== PHOTO_WIDTH || CARD_H !== PHOTO_HEIGHT) {
  throw new Error(
    `Board card slot is ${CARD_W}×${CARD_H} but og-photos stores ${PHOTO_WIDTH}×${PHOTO_HEIGHT}`,
  );
}

/**
 * Where the two photo cards land, top row first, so a suite can read the
 * rendered slots and hold the stacked layout.
 */
export const MORE_OR_LESS_CARD_SLOTS = [
  { left: BOARD.pad, top: BOARD.pad, width: CARD_W, height: CARD_H },
  { left: BOARD.pad, top: BOARD.pad + CARD_H + BOARD.gap, width: CARD_W, height: CARD_H },
];

/** Where the MORE / LESS row lands, left button first. */
export const MORE_OR_LESS_BUTTON_SLOTS = [
  {
    left: BOARD.pad,
    top: BOARD.pad + (CARD_H + BOARD.gap) * 2,
    width: BUTTON_W,
    height: BOARD.buttonHeight,
  },
  {
    left: BOARD.pad + BUTTON_W + BOARD.gap,
    top: BOARD.pad + (CARD_H + BOARD.gap) * 2,
    width: BUTTON_W,
    height: BOARD.buttonHeight,
  },
];

/**
 * Generate a spoiler-free OG image PNG for a game result.
 *
 * `shareId` picks which photo pair the More or Less board draws, so one share
 * link always renders the same board however many times it is scraped.
 */
export async function generateOgImagePng(data, shareId = '') {
  const svg = generateOgImageSvg(data, shareId);

  // TRUECOLOUR, NOT INDEXED. This card was palettised for weight: two
  // photographs encode to ~1 MB lossless and to ~300 KB through the quantiser.
  // X's composer would not build a card from the paletted render — HTML and
  // PNG both 200, Twitterbot served, spinner for 42 seconds and no card — and
  // the homepage lockup it does unfurl is a truecolour PNG. IHDR colour type 3
  // was the only thing left separating the two, so the card is now colour type
  // 2 and stays there. `palette: false` is explicit because sharp turns the
  // quantiser back on for anyone who adds `quality`, `effort`, `colours` or
  // `dither` to these options.
  //
  // `flatten` is what makes it colour type 2 rather than 6: the rasteriser
  // hands back RGBA, and an alpha channel the card never varies is a channel
  // of 255s for a scraper to decode. The SVG opens on a full-bleed `BG_COLOR`
  // rect, so compositing onto that same colour cannot move a pixel.
  //
  // `adaptiveFiltering` is the whole size story now that the quantiser is
  // gone: per-scanline filters take the photographs from ~910 KB to ~700 KB.
  // `compressionLevel` stays at sharp's default 6 — with those filters in
  // front of it, 9 buys under 5% for three times the CPU, on a path a crawler
  // waits on. ~400–770 KB is well inside what X accepts for a large summary
  // card, and one paste only pays for the first render (`serve.mjs` caches).
  const pngBuffer = await sharp(Buffer.from(svg))
    .flatten({ background: BG_COLOR })
    .png({ palette: false, adaptiveFiltering: true, compressionLevel: 6 })
    .toBuffer();
  return pngBuffer;
}

/**
 * Generate the standing line for og:description.
 */
export function generateOgDescription(data) {
  switch (data.game) {
    case 'more-or-less': {
      const parts = [`Streak ${data.streak}`];
      if (data.bestStreak > 0) parts.push(`best ${data.bestStreak}`);
      return parts.join(' · ');
    }
    case 'clueless':
      return `Found it in ${data.guessCount}`;
    case 'wordfall': {
      const words = data.wordCount;
      return `${data.score.toLocaleString('en-US')} pts · ${words} ${words === 1 ? 'word' : 'words'}`;
    }
  }
}

/**
 * Generate a spoiler-free OG image SVG for a game result.
 *
 * Exported for the suite: this string is the whole description of what a card
 * shows, so "the board carries no counters" is a claim to make here rather
 * than by diffing rasterised pixels.
 */
export function generateOgImageSvg(data, shareId = '') {
  switch (data.game) {
    case 'more-or-less':
      return generateMoreOrLessImage(shareId);
    case 'clueless':
      return generateCluelessImage(data);
    case 'wordfall':
      return generateWordfallImage(data);
  }
}

function svgShell(content, defs = '') {
  // librsvg/pango will use the font installed via fontconfig
  // Font family name matches the font's internal name
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG_COLOR}"/>
  ${defs}
  ${content}
</svg>`;
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** One photo card: the picture, the flat scrim over it, and the hairline edge. */
function boardCard(id, x, y, photo) {
  const { cardRadius, edge, scrim, surface } = BOARD;
  const frame = `x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="${cardRadius}"`;

  // A photo is a bonus, never a requirement — exactly as on the board itself,
  // where a failed image load leaves the card the same shape. Without one the
  // slot stays an elevated surface rather than a hole in the layout.
  const picture = photo
    ? `<image clip-path="url(#${id})" x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/jpeg;base64,${photo.toString('base64')}"/>
    <rect ${frame} fill="${scrim}"/>`
    : `<rect ${frame} fill="${surface}"/>`;

  return `${picture}
    <rect ${frame} fill="none" stroke="${edge}" stroke-width="1"/>`;
}

/**
 * One MORE / LESS button.
 *
 * Fredoka is a Latin display face with no U+2191 / U+2193 (`src/ui/theme.ts`
 * says as much), so the arrow is drawn as a triangle. Setting it as text is how
 * the grid emoji ended up as `.notdef` boxes.
 */
function boardButton({ x, y, fill, fillOpacity, stroke, strokeOpacity, label, labelColor, up }) {
  const { buttonHeight, buttonRadius } = BOARD;
  const midY = y + buttonHeight / 2;
  const arrowX = x + BUTTON_W / 2 - 62;
  const arm = 11;
  const arrow = up
    ? `${arrowX},${midY - arm} ${arrowX - arm},${midY + arm} ${arrowX + arm},${midY + arm}`
    : `${arrowX},${midY + arm} ${arrowX - arm},${midY - arm} ${arrowX + arm},${midY - arm}`;

  return `<rect x="${x}" y="${y}" width="${BUTTON_W}" height="${buttonHeight}" rx="${buttonRadius}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-opacity="${strokeOpacity}" stroke-width="1"/>
    <polygon points="${arrow}" fill="${labelColor}"/>
    <text x="${x + BUTTON_W / 2 - 34}" y="${midY}" font-family="Fredoka SemiBold" font-size="38" fill="${labelColor}" text-anchor="start" dominant-baseline="central">${escapeXml(label)}</text>`;
}

/**
 * The board a player just left: two stacked photo cards over MORE and LESS.
 *
 * Nothing else is on it. No item names or values, because a share card is
 * public and the pair that ended a run is a spoiler; no streak, best, rank or
 * seen counters, because they are chrome at timeline size and the standing
 * already reads in the paste line above the link.
 */
function generateMoreOrLessImage(shareId) {
  const { pad, cardRadius, ink, label, more, less } = BOARD;
  const photos = cardPhotoPair(shareId);
  const [topSlot, bottomSlot] = MORE_OR_LESS_CARD_SLOTS;
  const [moreSlot, lessSlot] = MORE_OR_LESS_BUTTON_SLOTS;

  const clip = (id, y) =>
    `<clipPath id="${id}"><rect x="${pad}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="${cardRadius}"/></clipPath>`;

  const defs = `<defs>${clip('wk-card-top', topSlot.top)}${clip('wk-card-bottom', bottomSlot.top)}</defs>`;

  const content = `
    ${boardCard('wk-card-top', topSlot.left, topSlot.top, photos?.top)}
    ${boardCard('wk-card-bottom', bottomSlot.left, bottomSlot.top, photos?.bottom)}
    ${boardButton({
      x: moreSlot.left,
      y: moreSlot.top,
      fill: more,
      fillOpacity: 1,
      stroke: '#FFFFFF',
      strokeOpacity: 0.2,
      label: 'More',
      labelColor: ink,
      up: true,
    })}
    ${boardButton({
      x: lessSlot.left,
      y: lessSlot.top,
      fill: less,
      fillOpacity: 0.16,
      stroke: less,
      strokeOpacity: 0.7,
      label: 'Less',
      labelColor: label,
      up: false,
    })}
  `;

  return svgShell(content, defs);
}

function generateCluelessImage(data) {
  const title = `WordKrush · Clueless #${data.puzzleNumber}`;
  const subtitle = data.levelName ? escapeXml(data.levelName) : '';
  const standing = `Found it in ${data.guessCount}`;

  // Generate heat grid (sorted cold → hot, no chronological order = no spoilers)
  const heatSquares = [
    ...Array(data.heatBuckets.unranked).fill('⬛'),
    ...Array(data.heatBuckets.cold).fill('🟥'),
    ...Array(data.heatBuckets.top_100).fill('🟧'),
    ...Array(data.heatBuckets.top_10).fill('🟨'),
    ...Array(data.heatBuckets.win).fill('🟩'),
  ];

  const grid = [];
  const squareSize = 40;
  const spacing = 8;
  const gridWidth = 10 * (squareSize + spacing) - spacing;
  const startX = (WIDTH - gridWidth) / 2;
  let x = startX;
  let y = subtitle ? 200 : 180;

  for (let i = 0; i < Math.min(heatSquares.length, 50); i++) {
    if (i > 0 && i % 10 === 0) {
      x = startX;
      y += squareSize + spacing;
    }
    // Use emoji as text (browsers render them)
    grid.push(
      `<text x="${x + squareSize / 2}" y="${y + squareSize / 2 + 4}" font-size="32" text-anchor="middle" dominant-baseline="central">${heatSquares[i]}</text>`,
    );
    x += squareSize + spacing;
  }

  const content = `
    <text x="${WIDTH / 2}" y="80" font-family="Fredoka SemiBold" font-size="48" fill="${TEXT_COLOR}" text-anchor="middle">${escapeXml(title)}</text>
    ${subtitle ? `<text x="${WIDTH / 2}" y="140" font-family="Fredoka SemiBold" font-size="28" fill="${TEXT_COLOR}" text-anchor="middle">${subtitle}</text>` : ''}
    ${grid.join('\n    ')}
    <text x="${WIDTH / 2}" y="${y + squareSize + 80}" font-family="Fredoka SemiBold" font-size="36" fill="${ACCENT_COLOR}" text-anchor="middle">${escapeXml(standing)}</text>
  `;

  return svgShell(content);
}

function generateWordfallImage(data) {
  const title = `WordKrush · Wordfall L${data.levelNumber}`;
  const subtitle = escapeXml(data.levelName);
  const standing = `${data.score.toLocaleString('en-US')} pts · ${data.wordCount} ${data.wordCount === 1 ? 'word' : 'words'}`;
  const verdict = data.won ? '✓ Complete' : 'Almost there';

  // Generate length-coded grid (no actual words = no spoilers)
  const lengthSquares = [
    ...Array(data.lengthBuckets.under_3).fill('🟦'),
    ...Array(data.lengthBuckets['3_4']).fill('🟦'),
    ...Array(data.lengthBuckets['5_7']).fill('🟨'),
    ...Array(data.lengthBuckets['8_plus']).fill('🟩'),
  ];

  const grid = [];
  const squareSize = 40;
  const spacing = 8;
  const gridWidth = 10 * (squareSize + spacing) - spacing;
  const startX = (WIDTH - gridWidth) / 2;
  let x = startX;
  let y = 200;

  for (let i = 0; i < Math.min(lengthSquares.length, 50); i++) {
    if (i > 0 && i % 10 === 0) {
      x = startX;
      y += squareSize + spacing;
    }
    grid.push(
      `<text x="${x + squareSize / 2}" y="${y + squareSize / 2 + 4}" font-size="32" text-anchor="middle" dominant-baseline="central">${lengthSquares[i]}</text>`,
    );
    x += squareSize + spacing;
  }

  const content = `
    <text x="${WIDTH / 2}" y="80" font-family="Fredoka SemiBold" font-size="48" fill="${TEXT_COLOR}" text-anchor="middle">${escapeXml(title)}</text>
    <text x="${WIDTH / 2}" y="140" font-family="Fredoka SemiBold" font-size="28" fill="${TEXT_COLOR}" text-anchor="middle">${subtitle}</text>
    ${grid.join('\n    ')}
    <text x="${WIDTH / 2}" y="${y + squareSize + 80}" font-family="Fredoka SemiBold" font-size="32" fill="${ACCENT_COLOR}" text-anchor="middle">${escapeXml(standing)}</text>
    <text x="${WIDTH / 2}" y="${y + squareSize + 130}" font-family="Fredoka SemiBold" font-size="28" fill="${TEXT_COLOR}" text-anchor="middle">${escapeXml(verdict)}</text>
  `;

  return svgShell(content);
}
