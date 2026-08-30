/**
 * Server-side OG image generation for share links.
 *
 * Generates 1200×630 spoiler-free Open Graph images as PNG (X/Twitter requires
 * rasterized images, not SVG). The images show the game name, the emoji grid,
 * and aggregate stats — never answers, guessed words, or item labels.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WIDTH = 1200;
const HEIGHT = 630;
const BG_COLOR = '#0A0817'; // brand.ink
const TEXT_COLOR = '#F4F0FF'; // brand.text
const ACCENT_COLOR = '#E8B840'; // brand.krush

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

/**
 * Generate a spoiler-free OG image PNG for a game result.
 */
export async function generateOgImagePng(data) {
  const svg = generateOgImageSvg(data);
  // Convert SVG to PNG using sharp
  const pngBuffer = await sharp(Buffer.from(svg))
    .png()
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
 */
function generateOgImageSvg(data) {
  switch (data.game) {
    case 'more-or-less':
      return generateMoreOrLessImage(data);
    case 'clueless':
      return generateCluelessImage(data);
    case 'wordfall':
      return generateWordfallImage(data);
  }
}

function svgShell(content) {
  // librsvg/pango will use the font installed via fontconfig
  // Font family name matches the font's internal name
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG_COLOR}"/>
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

function generateMoreOrLessImage(data) {
  const title = 'WordKrush · More or Less';
  const streak = `Streak ${data.streak}`;
  const best = data.bestStreak > 0 ? `Best ${data.bestStreak}` : '';

  // Generate grid of green squares (correct) + one red (wrong)
  const gridSize = Math.min(data.streak + 1, 50);
  const correct = data.streak;
  const grid = [];
  const squareSize = 40;
  const spacing = 8;
  const gridWidth = 10 * (squareSize + spacing) - spacing;
  const startX = (WIDTH - gridWidth) / 2;
  let x = startX;
  let y = 180;

  for (let i = 0; i < gridSize; i++) {
    if (i > 0 && i % 10 === 0) {
      x = startX;
      y += squareSize + spacing;
    }
    const color = i < correct ? '#22C55E' : '#EF4444'; // green : red
    grid.push(
      `<rect x="${x}" y="${y}" width="${squareSize}" height="${squareSize}" fill="${color}" rx="4"/>`,
    );
    x += squareSize + spacing;
  }

  const content = `
    <text x="${WIDTH / 2}" y="80" font-family="Fredoka SemiBold" font-size="48" fill="${TEXT_COLOR}" text-anchor="middle">${escapeXml(title)}</text>
    ${grid.join('\n    ')}
    <text x="${WIDTH / 2}" y="${y + squareSize + 80}" font-family="Fredoka SemiBold" font-size="36" fill="${ACCENT_COLOR}" text-anchor="middle">${escapeXml(streak)}</text>
    ${best ? `<text x="${WIDTH / 2}" y="${y + squareSize + 130}" font-family="Fredoka SemiBold" font-size="28" fill="${TEXT_COLOR}" text-anchor="middle">${escapeXml(best)}</text>` : ''}
  `;

  return svgShell(content);
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
