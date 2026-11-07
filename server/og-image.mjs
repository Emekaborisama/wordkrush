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
 * line above the link.
 *
 * Every other card — the Clueless and Wordfall results, the daily streak, and
 * the 1v1 and team invites — is the branded pop-up in `og-brand.mjs`, after
 * the Treasure Match pre-level page: scroll banner, cream box, gold-rimmed
 * Play, and the mascot with a speech bubble.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { BUTTON, PANEL_CX, brandCard, creamBox, flame, fluentIcon, inkText, letterTiles, lettering, measureCardText, squareGrid } from './og-brand.mjs';
import { PHOTO_HEIGHT, PHOTO_WIDTH, cardPhotoPair } from './og-photos.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WIDTH = 1200;
const HEIGHT = 630;
const BG_COLOR = '#0A0817'; // brand.ink

/**
 * Board geometry for the More or Less card, and the tokens it borrows from
 * `src/ui/theme.ts` / `src/games/registry.ts`.
 *
 * The board is STACKED, as the phone plays it and as the signed crop shows it:
 * one full-width photo card above another, MORE and LESS underneath, then a
 * dark bottom band so X's `summary_large_image` title strip ("WordKrush · More
 * or Less") cannot sit on the buttons. The measurements here trace that crop
 * — cards ending around y=214 and y=422 on a 1200×630 ground, an 86px button
 * row, then a 110px pad. The pad is the signed bar.
 *
 * That makes each photo slot ~5.9:1, and cropping a mostly-portrait Wikipedia
 * lead image that flat costs real detail. It is an accepted cost, not a
 * trade-off to reopen: the stacked pair is the product bar, and the pad is
 * what keeps both buttons clear of the overlay. `og-photos.mjs` spends its
 * crop budget on keeping the subject in the band that survives.
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
  /**
   * Dark band below the button row. 110px is the signed bar — enough for X's
   * title strip ("WordKrush · More or Less") plus chrome — and is also the
   * top-strip budget the buttons must sit below, so an overlay at either
   * edge cannot cover MORE or LESS.
   */
  bottomSafePad: 110,
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
  /** `theme.bgElevated` — the shelf X's title strip lands on. */
  band: '#121025',
};

const CARD_W = WIDTH - BOARD.pad * 2;
const CARD_H = Math.round(
  (HEIGHT - BOARD.pad - BOARD.bottomSafePad - BOARD.buttonHeight - BOARD.gap * 2) / 2,
);
const BUTTON_W = Math.round((CARD_W - BOARD.gap) / 2);

/**
 * X's `summary_large_image` title-strip budget, from either edge. Buttons
 * must sit below this from the top and above `HEIGHT` minus this from the
 * bottom.
 */
export const MORE_OR_LESS_X_TITLE_STRIP = BOARD.bottomSafePad;

/** Dark pad under the MORE / LESS row. Same figure as the top-strip budget. */
export const MORE_OR_LESS_BOTTOM_SAFE_PAD = BOARD.bottomSafePad;

// Copy Fredoka to a location fontconfig can find: librsvg (used by sharp for
// SVG) doesn't support data URI fonts in @font-face. Only the Higher or Lower
// board's button labels still use it; every branded card draws its lettering
// as outlines (`glyphs.mjs`) and needs no font at all.
const FONT_DIR = join(tmpdir(), 'wordkrush-fonts');
const CARD_FONTS = [['fredoka/600SemiBold/Fredoka_600SemiBold.ttf', 'Fredoka-SemiBold.ttf']];

// Ensure the fonts are installed for fontconfig/pango
mkdirSync(FONT_DIR, { recursive: true });
for (const [source, name] of CARD_FONTS) {
  const target = join(FONT_DIR, name);
  try {
    if (!readFileSync(target, { flag: 'r' }).length) throw new Error('copy');
  } catch {
    writeFileSync(target, readFileSync(join(__dirname, '../node_modules/@expo-google-fonts', source)));
  }
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
 * Full-bleed shelf under the stacked photos: the gap above the buttons, the
 * button row, and the safe pad X's title strip occupies.
 */
export const MORE_OR_LESS_BOTTOM_BAND = {
  left: 0,
  top: BOARD.pad + CARD_H * 2 + BOARD.gap,
  width: WIDTH,
  height: HEIGHT - (BOARD.pad + CARD_H * 2 + BOARD.gap),
  fill: BOARD.band,
};

/**
 * Generate a spoiler-free OG image PNG for a game result.
 *
 * `cardId` identifies the card being drawn (`server/og-card.mjs`). A More or
 * Less card names its two photos in that id, so one share link always renders
 * the same board however many times, and however spelled, it is scraped; the
 * id is also the seed that stands in for a photo the pool never loaded.
 */
export async function generateOgImagePng(data, cardId = '') {
  const svg = generateOgImageSvg(data, cardId);

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
    case 'streak': {
      const parts = [`${data.days}-day streak`];
      if (data.best > data.days) parts.push(`best ${data.best}`);
      return `${parts.join(' · ')}. Play a word game a day on WordKrush.`;
    }
    case 'duel':
      return 'Same pairs, one minute, head to head. Tap to accept the 1v1.';
    case 'team':
      return `Join the team with code ${data.code} and race friends live.`;
  }
}

/**
 * Generate a spoiler-free OG image SVG for a game result.
 *
 * Exported for the suite: this string is the whole description of what a card
 * shows, so "the board carries no counters" is a claim to make here rather
 * than by diffing rasterised pixels.
 */
export function generateOgImageSvg(data, cardId = '') {
  switch (data.game) {
    case 'more-or-less':
      return generateMoreOrLessImage(data, cardId);
    case 'clueless':
      return generateCluelessImage(data);
    case 'wordfall':
      return generateWordfallImage(data);
    case 'streak':
      return generateStreakImage(data);
    case 'duel':
      return generateDuelInviteImage();
    case 'team':
      return generateTeamInviteImage(data);
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
 * The board a player just left: two stacked photo cards over MORE and LESS,
 * sitting on a dark pad so X's title strip cannot cover the buttons.
 *
 * Nothing else is on it. No item names or values, because a share card is
 * public and the pair that ended a run is a spoiler; no streak, best, rank or
 * seen counters, because they are chrome at timeline size and the standing
 * already reads in the paste line above the link.
 */
function generateMoreOrLessImage(data, cardId) {
  const { pad, cardRadius, ink, label, more, less } = BOARD;
  const photos = cardPhotoPair(cardId, data.photos);
  const [topSlot, bottomSlot] = MORE_OR_LESS_CARD_SLOTS;
  const [moreSlot, lessSlot] = MORE_OR_LESS_BUTTON_SLOTS;
  const band = MORE_OR_LESS_BOTTOM_BAND;

  const clip = (id, y) =>
    `<clipPath id="${id}"><rect x="${pad}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="${cardRadius}"/></clipPath>`;

  const defs = `<defs>${clip('wk-card-top', topSlot.top)}${clip('wk-card-bottom', bottomSlot.top)}</defs>`;

  const content = `
    ${boardCard('wk-card-top', topSlot.left, topSlot.top, photos?.top)}
    ${boardCard('wk-card-bottom', bottomSlot.left, bottomSlot.top, photos?.bottom)}
    <rect x="${band.left}" y="${band.top}" width="${band.width}" height="${band.height}" fill="${band.fill}"/>
    ${boardButton({
      x: moreSlot.left,
      y: moreSlot.top,
      fill: more,
      fillOpacity: 1,
      stroke: '#FFFFFF',
      strokeOpacity: 0.2,
      label: 'Higher',
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
      label: 'Lower',
      labelColor: label,
      up: false,
    })}
  `;

  return svgShell(content, defs);
}

/** Clueless heat buckets as cube colours, cold to found — the paste's 🟥 🟧 🟨 🟩 order. */
const HEAT_SQUARES = [
  ['unranked', 'black'],
  ['cold', 'red'],
  ['top_100', 'orange'],
  ['top_10', 'yellow'],
  ['win', 'green'],
];

/** Wordfall word lengths as cube colours, short to long. */
const LENGTH_SQUARES = [
  ['under_3', 'blue'],
  ['3_4', 'blue'],
  ['5_7', 'yellow'],
  ['8_plus', 'green'],
];

function bucketSquares(buckets, order) {
  return order.flatMap(([key, color]) => Array(Math.min(buckets[key], 50)).fill(color));
}

/** The cream box every card fills: top edge under the banner, bottom above the button. */
const BOX = { top: 192, bottom: BUTTON.top - 22 };

const GOLD_NUMBER = { fill: '#FFD447', outline: '#7C3F00', shadow: '#7C3F00', weight: 0.2, drop: 0.05 };

/** A label line, the grid of squares, and the standing, stacked inside the box. */
function resultBox({ label, squares, standing }) {
  // Measure first, then centre the grid and the standing in the room left
  // under the label, so a short grid does not leave a hole at the bottom.
  const roomTop = BOX.top + 58;
  const room = BOX.bottom - 10 - roomTop;
  const measured = squareGrid(squares, { top: 0, maxHeight: 96 });
  const block = measured.height + 46;
  const gridTop = roomTop + Math.max(0, (room - block) / 2);
  const grid = squareGrid(squares, { top: gridTop, maxHeight: 96 });
  const standingY = gridTop + grid.height + 40;
  return [
    creamBox(BOX),
    inkText(label, { y: BOX.top + 42, size: fitIn(label, 28) }),
    grid.body,
    inkText(standing, { y: standingY, size: fitIn(standing, 34) }),
  ].join('');
}

/** Fits a line inside the cream box. */
function fitIn(text, size) {
  const max = 500;
  const width = measureCardText(text, size);
  return width <= max ? size : Math.floor((size * max) / width);
}

function plural(n, one, many) {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

function generateCluelessImage(data) {
  return brandCard({
    title: `Clueless #${data.puzzleNumber}`,
    bubble: data.guessCount <= 1 ? ['First try!', 'Can you match it?'] : ['Can you find it', `in fewer than ${data.guessCount}?`],
    button: 'YOUR TURN',
    mood: 'cheer',
    content: resultBox({
      label: data.levelName ? data.levelName : 'Secret word found',
      squares: bucketSquares(data.heatBuckets, HEAT_SQUARES),
      standing: `Found it in ${plural(data.guessCount, 'guess', 'guesses')}`,
    }),
  });
}

function generateWordfallImage(data) {
  const score = data.score.toLocaleString('en-US');
  return brandCard({
    title: `Wordfall · Level ${data.levelNumber}`,
    bubble: data.won ? ['Level cleared!', `Can you beat ${score}?`] : ['So close!', 'Can you finish it?'],
    button: 'YOUR TURN',
    mood: data.won ? 'cheer' : 'idle',
    content: resultBox({
      label: `${data.levelName} · ${data.won ? 'cleared' : 'almost'}`,
      squares: bucketSquares(data.lengthBuckets, LENGTH_SQUARES),
      standing: `${score} pts · ${plural(data.wordCount, 'word', 'words')}`,
    }),
  });
}

/**
 * The daily streak: the flame and the count, then the last seven days as
 * sockets, lit for the days the streak covers — the streak calendar of the
 * Magic Streak reference, cut to a week.
 */
function generateStreakImage(data) {
  const days = data.days;
  const count = String(days);
  const numberSize = count.length > 3 ? 84 : 100;
  const flameSize = 88;
  const numberWidth = measureCardText(count, numberSize);
  const left = PANEL_CX - (flameSize + 14 + numberWidth) / 2;
  const sockets = Array.from({ length: 7 }, (_, i) => {
    const size = 46;
    const gap = 14;
    const x = PANEL_CX - (7 * size + 6 * gap) / 2 + i * (size + gap);
    const y = BOX.bottom - 66;
    const lit = i >= 7 - Math.min(days, 7);
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size / 2}" fill="${lit ? '#FFE7A3' : '#F2D9B5'}" stroke="${lit ? '#E8920B' : '#E0BF95'}" stroke-width="3"/>${lit ? flame({ x: x + 7, y: y + 6, size: size - 14 }) : ''}`;
  }).join('');
  return brandCard({
    title: 'Daily Streak',
    bubble: data.best > days ? [`My best is ${data.best} days.`, 'Can you keep up?'] : [days > 1 ? 'My longest streak yet!' : 'Day one!', 'Can you keep up?'],
    button: 'PLAY FREE',
    mood: 'cheer',
    content: [
      creamBox(BOX),
      flame({ x: left, y: BOX.top + 14, size: flameSize }),
      lettering(count, { x: left + flameSize + 14, y: BOX.top + 92, size: numberSize, anchor: 'start', ...GOLD_NUMBER }),
      inkText(days === 1 ? 'DAY IN A ROW' : 'DAYS IN A ROW', { y: BOX.top + 128, size: 24 }),
      sockets,
    ].join(''),
  });
}

/** A 1v1 invite: you against me, the same pairs, one minute. */
function generateDuelInviteImage() {
  const disc = (cx, label, fill, edge) =>
    `<circle cx="${cx}" cy="${BOX.top + 104}" r="46" fill="${edge}"/><circle cx="${cx}" cy="${BOX.top + 100}" r="44" fill="${fill}" stroke="#FFFFFF" stroke-width="4"/>${lettering(label, { x: cx, y: BOX.top + 113, size: 36 })}`;
  return brandCard({
    title: '1v1 Challenge',
    bubble: ['Think you can', 'beat me?'],
    button: 'ACCEPT',
    mood: 'idle',
    content: [
      creamBox(BOX),
      inkText('Higher or Lower', { y: BOX.top + 40, size: 28 }),
      disc(PANEL_CX - 150, 'ME', '#FFB31F', '#C97905'),
      fluentIcon('swords', { x: PANEL_CX - 46, y: BOX.top + 54, size: 92 }),
      disc(PANEL_CX + 150, 'YOU', '#3E9BFF', '#2560CC'),
      inkText('Same pairs · one minute', { y: BOX.bottom - 18, size: 26 }),
    ].join(''),
  });
}

/** A team invite, with the code in letter tiles for anyone who types it. */
function generateTeamInviteImage(data) {
  return brandCard({
    title: 'Join My Team',
    bubble: ['Come race', 'with us!'],
    button: 'JOIN',
    mood: 'cheer',
    content: [
      creamBox(BOX),
      inkText('Invite code', { y: BOX.top + 40, size: 28 }),
      letterTiles(data.code, { y: BOX.top + 72 }),
      inkText('Live word races with friends', { y: BOX.bottom - 18, size: 26 }),
    ].join(''),
  });
}
