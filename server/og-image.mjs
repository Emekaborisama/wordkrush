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
 * The board runs side by side rather than stacked as the phone does. On a
 * 1.91:1 card two full-width rows are 4.8:1 slots, and a Wikipedia lead image
 * cropped that flat is a necktie or a slice of a flag — the photos stop being
 * recognisable, which is the one thing this card exists to show. Turning the
 * pair sideways gives each photo a near-square slot and keeps the prompt the
 * game actually asks: this one, or that one.
 *
 * Everything lands inside the 2:1 band X centre-crops a `summary_large_image`
 * to. `CARD_W` / `CARD_H` are the photo size in `og-photos.mjs`; change them
 * together or a card photo is rescaled a second time on the way out.
 */
const BOARD = {
  pad: 20,
  gap: 14,
  cardRadius: 28,
  buttonHeight: 92,
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

const CARD_W = Math.round((WIDTH - BOARD.pad * 2 - BOARD.gap) / 2);
const CARD_H = HEIGHT - BOARD.pad * 2 - BOARD.buttonHeight - BOARD.gap;
const BUTTON_W = CARD_W;

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

/** Where the two photo cards land, so a suite can read the rendered slots. */
export const MORE_OR_LESS_CARD_SLOTS = [
  { left: BOARD.pad, top: BOARD.pad, width: CARD_W, height: CARD_H },
  { left: BOARD.pad + CARD_W + BOARD.gap, top: BOARD.pad, width: CARD_W, height: CARD_H },
];

/**
 * Generate a spoiler-free OG image PNG for a game result.
 *
 * `shareId` picks which photo pair the More or Less board draws, so one share
 * link always renders the same board however many times it is scraped.
 */
export async function generateOgImagePng(data, shareId = '') {
  const svg = generateOgImageSvg(data, shareId);
  // Convert SVG to PNG using sharp.
  //
  // Palettised, because the board card carries two photographs and a lossless
  // PNG of those is around 900 KB — past the size where a scraper is happy and
  // three times what X will keep after it re-encodes the card anyway. 256
  // colours over a dark scrim shows no banding at card size, and the grid
  // cards were already flat colour. `effort` stays low: above 1 it buys single
  // -digit percentages for several times the CPU, on a path a crawler waits on.
  const pngBuffer = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, palette: true, quality: 100, effort: 1 })
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
 * The board a player just left: two photo cards over MORE and LESS.
 *
 * Nothing else is on it. No item names or values, because a share card is
 * public and the pair that ended a run is a spoiler; no streak, best, rank or
 * seen counters, because they are chrome at timeline size and the standing
 * already reads in the paste line above the link.
 */
function generateMoreOrLessImage(shareId) {
  const { pad, gap, cardRadius, ink, label, more, less } = BOARD;
  const photos = cardPhotoPair(shareId);

  const leftX = pad;
  const rightX = pad + CARD_W + gap;
  const buttonY = pad + CARD_H + gap;

  const clip = (id, x) =>
    `<clipPath id="${id}"><rect x="${x}" y="${pad}" width="${CARD_W}" height="${CARD_H}" rx="${cardRadius}"/></clipPath>`;

  const defs = `<defs>${clip('wk-card-left', leftX)}${clip('wk-card-right', rightX)}</defs>`;

  const content = `
    ${boardCard('wk-card-left', leftX, pad, photos?.left)}
    ${boardCard('wk-card-right', rightX, pad, photos?.right)}
    ${boardButton({
      x: leftX,
      y: buttonY,
      fill: more,
      fillOpacity: 1,
      stroke: '#FFFFFF',
      strokeOpacity: 0.2,
      label: 'More',
      labelColor: ink,
      up: true,
    })}
    ${boardButton({
      x: rightX,
      y: buttonY,
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
