/**
 * The branded share card: the kit's sky, the mascot on a cloud, and the
 * result or invite in outlined lettering beside it.
 *
 * Every card that is not the More or Less board uses this frame — Clueless
 * and Wordfall results, the daily streak, and the 1v1 and team invites — so a
 * WordKrush link reads as WordKrush at timeline size whichever one it is.
 *
 * NOTHING HERE IS SET AS AN EMOJI OR A SYMBOL GLYPH. The renderer has Exo 2
 * and Fredoka and nothing else, so a 🟩 or a ✓ set as text is a `.notdef`
 * box (the 0.19 Clueless and Wordfall cards drew a row of them). Squares,
 * flames and ticks are shapes.
 *
 * The bottom-left corner holds only the mascot's cloud: X lays the link's
 * domain over that corner of a large summary card.
 */
import { mascotMarkup } from './mascot.mjs';

export const BRAND_WIDTH = 1200;
export const BRAND_HEIGHT = 630;

/** `src/ui/theme.ts` tokens the card borrows. */
const T = {
  skyTop: '#2F7FDB',
  skyMid: '#58AEEA',
  skyBottom: '#B8EAF8',
  cloudShade: '#D3EFFA',
  navyDeep: '#173F7E',
  white: '#FFFFFF',
  gold: '#FFC928',
  goldText: '#FFE45C',
  goldEdge: '#8C4F00',
  cream: '#FFEAD3',
  creamEdge: '#EEC39B',
  ink: '#173A63',
  green: { top: '#A3E63A', bottom: '#4AB41F', lip: '#2F8012', outline: '#245F0C' },
  red: { top: '#FF8E8E', bottom: '#EC3D4F', lip: '#B2223A', outline: '#7F1428' },
  coral: { top: '#FFA2A6', bottom: '#F15D70', lip: '#C33B52', outline: '#8C2438' },
};

/** The kit's headline face (`font.black`), installed for the renderer by `og-image.mjs`. */
// The static Black cut names its family "Exo 2 Black" at regular weight (name
// id 1), the same way "Fredoka SemiBold" is found for the More or Less card.
// Fredoka is listed behind it so a renderer that misses Exo still sets the
// card in a rounded sans rather than a default serif.
export const HEADLINE_FONT = "'Exo 2 Black', 'Fredoka SemiBold', sans-serif";

/** Centre line of the right-hand column, where the words go. */
export const COLUMN_X = 815;

/** Square colours, as the paste's emoji read in a chat. */
export const SQUARE = {
  black: { face: '#3B3F58', lip: '#23263A' },
  red: { face: '#F2475A', lip: '#B21F38' },
  orange: { face: '#FF9A2E', lip: '#C9611C' },
  yellow: { face: '#FFD23F', lip: '#C99A0E' },
  green: { face: '#4CCB5E', lip: '#258A35' },
  blue: { face: '#3E9BFF', lip: '#2560CC' },
};

export function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Lettering the kit way: white (or gold) with a thick dark outline under it.
 * `paint-order` puts the stroke behind the fill, so the outline thickens the
 * letter rather than eating into it.
 */
export function outlined(text, { x = COLUMN_X, y, size, fill = T.white, stroke = T.navyDeep, anchor = 'middle', strokeWidth }) {
  const width = strokeWidth ?? Math.max(4, Math.round(size * 0.16));
  return `<text x="${x}" y="${y}" font-family="${HEADLINE_FONT}" font-size="${size}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" paint-order="stroke" text-anchor="${anchor}">${escapeXml(text)}</text>`;
}

/** "Word" in white and "Krush" in gold, as the in-app logo spells it. */
function wordmark(y) {
  const size = 46;
  return `<text x="${COLUMN_X}" y="${y}" font-family="${HEADLINE_FONT}" font-size="${size}" stroke="${T.navyDeep}" stroke-width="8" stroke-linejoin="round" paint-order="stroke" text-anchor="middle"><tspan fill="${T.white}">Word</tspan><tspan fill="${T.goldText}">Krush</tspan></text>`;
}

function rays(cx, cy) {
  const wedges = [];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const a0 = (i / count) * Math.PI * 2;
    const a1 = a0 + Math.PI / count;
    const r = 900;
    wedges.push(
      `<path d="M${cx} ${cy} L${(cx + Math.cos(a0) * r).toFixed(1)} ${(cy + Math.sin(a0) * r).toFixed(1)} L${(cx + Math.cos(a1) * r).toFixed(1)} ${(cy + Math.sin(a1) * r).toFixed(1)} Z"/>`,
    );
  }
  return `<g fill="#FFFFFF" opacity="0.09">${wedges.join('')}</g>`;
}

/** A bank of cumulus along the bottom, as `SkyBackground` draws it. */
function clouds() {
  const bumps = [
    [30, 620, 90], [150, 590, 80], [270, 605, 85], [390, 625, 70], [520, 640, 80],
    [660, 650, 70], [800, 655, 70], [940, 650, 75], [1070, 640, 80], [1190, 625, 85],
  ];
  const shade = bumps.map(([x, y, r]) => `<circle cx="${x}" cy="${y + 10}" r="${r}"/>`).join('');
  const face = bumps.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
  return `<g fill="${T.cloudShade}">${shade}</g><g fill="#FFFFFF">${face}</g>`;
}

/**
 * A glossy kit button (`GlossFace`) drawn flat: lip, gradient face, shine
 * band and outlined label. A card cannot be pressed, but the button tells a
 * reader what the link does.
 */
export function glossButton(label, { y, width = 380, height = 80, tone = 'green', id = 'btn' }) {
  const t = T[tone];
  const x = COLUMN_X - width / 2;
  const r = 22;
  return {
    defs: `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.top}"/><stop offset="1" stop-color="${t.bottom}"/></linearGradient>`,
    body: `<rect x="${x - 3}" y="${y - 3}" width="${width + 6}" height="${height + 12}" rx="${r + 3}" fill="${t.outline}"/>
    <rect x="${x}" y="${y + 6}" width="${width}" height="${height}" rx="${r}" fill="${t.lip}"/>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${r}" fill="url(#${id})"/>
    <rect x="${x + 14}" y="${y + 7}" width="${width - 28}" height="${height * 0.32}" rx="${height * 0.16}" fill="#FFFFFF" opacity="0.28"/>
    ${outlined(label, { y: y + height / 2 + 13, size: 38, stroke: t.outline, strokeWidth: 7 })}`,
  };
}

/** The same flame as the top bar's streak pill (`FLAME` in `src/ui/icons/art.tsx`), in a 64-unit box. */
const FLAME =
  'M32 4 C35.5 13.5 47.5 19 49.5 33 C51.5 47.5 43 58 32 58 C21 58 12.5 50 13.5 38 ' +
  'C14.2 30.5 18 25.5 22.5 21.5 C22.8 27 24.8 30.2 28 31.6 C26.4 22.4 27.8 12 32 4 Z';
const FLAME_CORE =
  'M32 26.5 C34.8 33 41.5 37 41.5 45.2 C41.5 51.6 37.4 55.4 32 55.4 ' +
  'C26.6 55.4 22.5 51.6 22.5 45.6 C22.5 39.8 27.8 35.4 32 26.5 Z';

export function flame({ x, y, size }) {
  const s = size / 64;
  return {
    defs: `<linearGradient id="wk-flame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC94A"/><stop offset="0.6" stop-color="#FF7A1A"/><stop offset="1" stop-color="#D9480F"/></linearGradient><linearGradient id="wk-core" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFDE0"/><stop offset="1" stop-color="#FFB21C"/></linearGradient>`,
    body: `<g transform="translate(${x} ${y}) scale(${s})"><path d="${FLAME}" fill="url(#wk-flame)" stroke="#8A2A06" stroke-width="2.6" stroke-linejoin="round"/><path d="${FLAME_CORE}" fill="url(#wk-core)"/><path d="M18.6 36 C18 41.5 19.8 46.5 23.4 50" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" opacity="0.75"/></g>`,
  };
}

/**
 * A grid of result squares, ten to a row, centred on the column and sized to
 * fit `maxHeight`. Each is a little cube — face and darker lip — so the card
 * matches the board's tiles rather than a chat's emoji.
 */
export function squareGrid(colors, { top, maxHeight, maxSize = 50 }) {
  const cells = colors.slice(0, 50);
  if (cells.length === 0) return { body: '', height: 0 };
  const perRow = Math.min(10, cells.length);
  const rows = Math.ceil(cells.length / 10);
  const gap = 9;
  const size = Math.max(18, Math.min(maxSize, Math.floor((maxHeight - (rows - 1) * gap) / rows)));
  const rowWidth = perRow * size + (perRow - 1) * gap;
  const left = COLUMN_X - rowWidth / 2;
  const radius = Math.round(size * 0.22);
  const body = cells
    .map((name, i) => {
      const color = SQUARE[name];
      const x = left + (i % 10) * (size + gap);
      const y = top + Math.floor(i / 10) * (size + gap);
      return `<rect x="${x}" y="${y + 3}" width="${size}" height="${size}" rx="${radius}" fill="${color.lip}"/><rect x="${x}" y="${y}" width="${size}" height="${size - 2}" rx="${radius}" fill="${color.face}" stroke="${T.navyDeep}" stroke-opacity="0.35" stroke-width="2"/><rect x="${x + size * 0.18}" y="${y + size * 0.12}" width="${size * 0.64}" height="${size * 0.18}" rx="${size * 0.09}" fill="#FFFFFF" opacity="0.35"/>`;
    })
    .join('');
  return { body, height: rows * size + (rows - 1) * gap + 3 };
}

/** One cream letter tile with navy lettering, the `BlockTile` look. */
export function letterTiles(text, { y, size = 74 }) {
  const letters = [...text];
  const gap = 10;
  const width = letters.length * size + (letters.length - 1) * gap;
  const left = COLUMN_X - width / 2;
  return letters
    .map((letter, i) => {
      const x = left + i * (size + gap);
      return `<rect x="${x}" y="${y + 5}" width="${size}" height="${size}" rx="14" fill="${T.creamEdge}"/><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="14" fill="${T.cream}" stroke="${T.navyDeep}" stroke-opacity="0.4" stroke-width="2.5"/><text x="${x + size / 2}" y="${y + size * 0.72}" font-family="${HEADLINE_FONT}" font-size="${Math.round(size * 0.62)}" fill="${T.ink}" text-anchor="middle">${escapeXml(letter)}</text>`;
    })
    .join('');
}

/**
 * The whole card: sky, rays behind the mascot, clouds, the mascot, the
 * wordmark, then `content` (already positioned in the right column).
 */
export function brandCard({ content, defs = '', mood = 'idle' }) {
  const cat = mascotMarkup({ x: 40, y: 140, width: 400, mood, prefix: 'wkcat' });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${BRAND_WIDTH}" height="${BRAND_HEIGHT}" viewBox="0 0 ${BRAND_WIDTH} ${BRAND_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wk-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.skyTop}"/><stop offset="0.62" stop-color="${T.skyMid}"/><stop offset="1" stop-color="${T.skyBottom}"/></linearGradient>
    ${cat.defs}
    ${defs}
  </defs>
  <rect width="${BRAND_WIDTH}" height="${BRAND_HEIGHT}" fill="url(#wk-sky)"/>
  ${rays(240, 330)}
  ${clouds()}
  ${cat.body}
  ${wordmark(92)}
  ${content}
</svg>`;
}
