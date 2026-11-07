/**
 * The branded share card, after the Treasure Match pre-level page the owner
 * pointed at: a pop-up with a red scroll banner and gold rolled ends, the title
 * in chunky cream lettering with a dark outline and a drop shadow, a cream
 * box holding what the link is about, a big green button in a gold rim, and the
 * mascot beside it with a speech bubble. The colours are the app's own (the
 * kit's red, gold, cream and sky), so the card looks like the game it opens.
 *
 * Every card that is not the Higher or Lower board uses this frame: Clueless
 * and Wordfall results, the daily streak, and the 1v1 and team invites.
 *
 * ALL LETTERING IS OUTLINES (`glyphs.mjs`), never `<text>`. The renderer then
 * needs no fonts at all, so a card looks the same on a laptop as on Railway,
 * and no emoji or symbol can fall back to a `.notdef` box.
 *
 * The bottom-left corner holds only clouds: X lays the link's domain there.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { measureText, textPath } from './glyphs.mjs';
import { mascotMarkup } from './mascot.mjs';

export const BRAND_WIDTH = 1200;
export const BRAND_HEIGHT = 630;

/**
 * The face every card sets its words in. Fredoka Bold is the free rounded
 * face closest to Treasure Match's Mikado; `'headline'` switches to the app's
 * Exo 2 Black.
 */
export const CARD_FACE = 'display';

/** `src/ui/theme.ts` tokens the card borrows, plus the reference's maroon ink. */
const T = {
  skyTop: '#2F7FDB',
  skyMid: '#58AEEA',
  skyBottom: '#B8EAF8',
  cloudShade: '#D3EFFA',
  cream: '#FFF4D6',
  creamBox: '#FFF3DA',
  creamEdge: '#E7C79C',
  creamShade: '#F6DDB8',
  maroon: '#6E1424',
  maroonInk: '#7A1C2E',
  ink: '#173A63',
  navyDeep: '#173F7E',
  red: { top: '#D8334A', bottom: '#9A1730', edge: '#6E1020', deep: '#7A1428' },
  gold: { top: '#FFE97A', mid: '#FFC928', bottom: '#E8920B', edge: '#8C4F00' },
  green: { top: '#A3E63A', bottom: '#4AB41F', lip: '#2F8012', outline: '#245F0C' },
};

/** Where the pop-up sits: the right two-thirds of the card. */
export const PANEL = { left: 528, right: 1152, top: 128, bottom: 548 };
export const PANEL_CX = (PANEL.left + PANEL.right) / 2;

/** Square colours, as the paste's emoji read in a chat. */
export const SQUARE = {
  black: { face: '#3B3F58', lip: '#23263A' },
  red: { face: '#F2475A', lip: '#B21F38' },
  orange: { face: '#FF9A2E', lip: '#C9611C' },
  yellow: { face: '#FFD23F', lip: '#C99A0E' },
  green: { face: '#4CCB5E', lip: '#258A35' },
  blue: { face: '#3E9BFF', lip: '#2560CC' },
};

function escapeAttr(text) {
  return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Chunky lettering the Treasure Match way: a dark drop shadow, a thick dark
 * outline, then the fill. `data-text` keeps the words readable to the suite.
 */
export function lettering(
  text,
  { x = PANEL_CX, y, size, fill = T.cream, outline = T.maroon, shadow = outline, anchor = 'middle', weight = 0.24, drop = 0.09, face = CARD_FACE },
) {
  const { d } = textPath(text, { face, size, x, y, anchor });
  const stroke = Math.max(3, size * weight).toFixed(1);
  const offset = Math.max(2, size * drop).toFixed(1);
  return `<g data-text="${escapeAttr(text)}"><path d="${d}" transform="translate(0 ${offset})" fill="${shadow}" stroke="${shadow}" stroke-width="${stroke}" stroke-linejoin="round"/><path d="${d}" fill="${outline}" stroke="${outline}" stroke-width="${stroke}" stroke-linejoin="round"/><path d="${d}" fill="${fill}"/></g>`;
}

/** Plain ink lettering for copy inside the cream box, as the reference's "Goals:". */
export function inkText(text, { x = PANEL_CX, y, size, fill = T.maroonInk, anchor = 'middle', face = CARD_FACE }) {
  const { d } = textPath(text, { face, size, x, y, anchor });
  return `<g data-text="${escapeAttr(text)}"><path d="${d}" fill="${fill}"/></g>`;
}

/** Width of card lettering at `size`, in px. */
export function measureCardText(text, size, face = CARD_FACE) {
  return measureText(text, { face, size });
}

/** The largest size, at most `size`, at which `text` fits `maxWidth`. */
export function fitSize(text, size, maxWidth, face = CARD_FACE) {
  const width = measureText(text, { face, size });
  return width <= maxWidth ? size : Math.floor((size * maxWidth) / width);
}

function gradient(id, stops, { x2 = 0, y2 = 1 } = {}) {
  const body = stops.map(([offset, color]) => `<stop offset="${offset}" stop-color="${color}"/>`).join('');
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${body}</linearGradient>`;
}

function rays(cx, cy) {
  const wedges = [];
  const count = 16;
  for (let i = 0; i < count; i++) {
    const a0 = (i / count) * Math.PI * 2;
    const a1 = a0 + Math.PI / count;
    const r = 1000;
    wedges.push(
      `<path d="M${cx} ${cy} L${(cx + Math.cos(a0) * r).toFixed(1)} ${(cy + Math.sin(a0) * r).toFixed(1)} L${(cx + Math.cos(a1) * r).toFixed(1)} ${(cy + Math.sin(a1) * r).toFixed(1)} Z"/>`,
    );
  }
  return `<g fill="#FFFFFF" opacity="0.08">${wedges.join('')}</g>`;
}

/** A bank of cumulus along the bottom, as `SkyBackground` draws it. */
function clouds() {
  const bumps = [
    [10, 610, 95], [130, 585, 85], [255, 600, 90], [380, 618, 80], [510, 640, 80],
    [650, 655, 70], [800, 660, 70], [940, 652, 75], [1070, 640, 80], [1195, 622, 90],
  ];
  const shade = bumps.map(([x, y, r]) => `<circle cx="${x}" cy="${y + 10}" r="${r}"/>`).join('');
  const face = bumps.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
  return `<g fill="${T.cloudShade}">${shade}</g><g fill="#FFFFFF">${face}</g>`;
}

/** A few small clouds drifting high in the sky. */
function skyClouds() {
  const puff = (x, y, s) =>
    `<g transform="translate(${x} ${y}) scale(${s})" fill="#FFFFFF" opacity="0.8"><circle cx="0" cy="10" r="22"/><circle cx="26" cy="0" r="28"/><circle cx="56" cy="8" r="24"/><rect x="-10" y="10" width="76" height="22" rx="11"/></g>`;
  return puff(440, 40, 0.9) + puff(1090, 22, 0.7);
}

/** The app's logo: WORD on four coloured cubes, KRUSH! in gold. Top-left. */
function blockLogo() {
  const cubes = [
    ['W', '#FF5D6E', '#C33B52'],
    ['O', '#FFA23A', '#C9611C'],
    ['R', '#7BD453', '#3F8F25'],
    ['D', '#3E9BFF', '#2560CC'],
  ];
  const size = 48;
  const gap = 5;
  const left = 34;
  const top = 26;
  const tiles = cubes
    .map(([letter, face, side], i) => {
      const x = left + i * (size + gap);
      const tilt = i % 2 === 0 ? -4 : 4;
      return `<g transform="rotate(${tilt} ${x + size / 2} ${top + size / 2})"><rect x="${x}" y="${top + 6}" width="${size}" height="${size}" rx="10" fill="${side}"/><rect x="${x}" y="${top}" width="${size}" height="${size}" rx="10" fill="${face}" stroke="${T.navyDeep}" stroke-opacity="0.45" stroke-width="2.5"/><rect x="${x + 7}" y="${top + 5}" width="${size - 14}" height="9" rx="4.5" fill="#FFFFFF" opacity="0.35"/>${lettering(letter, { x: x + size / 2, y: top + size * 0.76, size: 34, fill: '#FFFFFF', outline: T.navyDeep, weight: 0.18, drop: 0.04 })}</g>`;
    })
    .join('');
  const krush = lettering('KRUSH!', {
    x: left + cubes.length * (size + gap) + 8,
    y: top + size * 0.84,
    size: 44,
    anchor: 'start',
    fill: '#FFD447',
    outline: '#7C3F00',
    shadow: '#C26B00',
  });
  return `<g data-part="wordmark">${tiles}${krush}</g>`;
}

/**
 * The cream speech bubble over the cat, its tail pointing down at the cat's
 * head: the reference's hint bubble. One or two lines.
 */
function speechBubble(lines) {
  const left = 40;
  const right = 452;
  const top = 112;
  const lineHeight = 42;
  const bottom = top + 34 + lines.length * lineHeight;
  const tailX = 236;
  const d = `M${left + 22} ${top} H${right - 22} Q${right} ${top} ${right} ${top + 22} V${bottom - 22} Q${right} ${bottom} ${right - 22} ${bottom} H${tailX + 30} L${tailX + 4} ${bottom + 36} L${tailX - 12} ${bottom} H${left + 22} Q${left} ${bottom} ${left} ${bottom - 22} V${top + 22} Q${left} ${top} ${left + 22} ${top} Z`;
  const words = lines
    .map((line, i) => inkText(line, { x: (left + right) / 2, y: top + 50 + i * lineHeight, size: fitSize(line, 34, right - left - 44) }))
    .join('');
  return `<g data-part="bubble"><path d="${d}" transform="translate(0 7)" fill="#14305E" opacity="0.25"/><path d="${d}" fill="${T.cream}" stroke="${T.maroon}" stroke-width="5" stroke-linejoin="round"/>${words}</g>`;
}

/**
 * The pop-up body: a dark keyline, a gold rim, a red body with a darker inner
 * border and a soft top light, and the gold base the reference stands it on.
 */
function panel() {
  const { left, right, top, bottom } = PANEL;
  const w = right - left;
  const h = bottom - top;
  return `<g data-part="panel">
    <rect x="${left - 4}" y="${top + 12}" width="${w + 8}" height="${h}" rx="34" fill="#0F2A5A" opacity="0.22"/>
    <rect x="${left - 4}" y="${top - 4}" width="${w + 8}" height="${h + 8}" rx="34" fill="${T.red.edge}"/>
    <rect x="${left}" y="${top}" width="${w}" height="${h}" rx="30" fill="url(#wk-gold)"/>
    <rect x="${left + 8}" y="${top + 8}" width="${w - 16}" height="${h - 16}" rx="24" fill="url(#wk-panel-red)" stroke="${T.red.deep}" stroke-width="3"/>
    <rect x="${left + 20}" y="${top + 14}" width="${w - 40}" height="${Math.round(h * 0.3)}" rx="20" fill="#FFFFFF" opacity="0.07"/>
    <rect x="${left - 18}" y="${bottom - 20}" width="${w + 36}" height="40" rx="20" fill="${T.gold.edge}"/>
    <rect x="${left - 15}" y="${bottom - 20}" width="${w + 30}" height="34" rx="17" fill="url(#wk-gold)"/>
    <rect x="${left + 4}" y="${bottom - 15}" width="${w - 8}" height="8" rx="4" fill="#FFFFFF" opacity="0.4"/>
  </g>`;
}

/**
 * The red scroll banner riding the top of the panel: an arched cloth with a
 * gold top edge and a gold roll at each end, as on the reference's
 * "Level 12" banner. The title sits on the cloth.
 */
function scrollBanner(title) {
  const left = PANEL.left - 36;
  const right = PANEL.right + 36;
  const top = PANEL.top - 70;
  const bottom = PANEL.top + 44;
  const arch = 16;
  const cx = (left + right) / 2;
  const inL = left + 24;
  const inR = right - 24;
  const cloth = `M${inL} ${top + arch} Q${cx} ${top - arch} ${inR} ${top + arch} L${inR} ${bottom} Q${cx} ${bottom - 2 * arch} ${inL} ${bottom} Z`;
  const hem = `M${inL} ${bottom} Q${cx} ${bottom - 2 * arch} ${inR} ${bottom}`;
  const edge = `M${inL} ${top + arch} Q${cx} ${top - arch} ${inR} ${top + arch} L${inR} ${top + arch + 13} Q${cx} ${top - arch + 13} ${inL} ${top + arch + 13} Z`;
  const roll = (x) => `<rect x="${x - 22}" y="${top + 2}" width="44" height="${bottom - top + 10}" rx="22" fill="${T.gold.edge}"/><rect x="${x - 19}" y="${top + 5}" width="38" height="${bottom - top + 4}" rx="19" fill="url(#wk-roll)"/><ellipse cx="${x}" cy="${top + 14}" rx="14" ry="8" fill="#FFE97A" stroke="${T.gold.edge}" stroke-width="3"/><ellipse cx="${x}" cy="${bottom + 2}" rx="14" ry="8" fill="#FFE97A" stroke="${T.gold.edge}" stroke-width="3"/><circle cx="${x}" cy="${bottom + 2}" r="4" fill="${T.gold.edge}"/>`;
  const size = fitSize(title, 64, inR - inL - 80);
  return `<g data-part="banner">
    <path d="${cloth}" transform="translate(0 9)" fill="#0F2A5A" opacity="0.22"/>
    <path d="${cloth}" fill="url(#wk-cloth)" stroke="${T.red.edge}" stroke-width="5" stroke-linejoin="round"/>
    <path d="${edge}" fill="url(#wk-gold)" stroke="${T.gold.edge}" stroke-width="3" stroke-linejoin="round"/>
    <path d="${hem}" fill="none" stroke="${T.gold.edge}" stroke-width="16" stroke-linecap="round"/>
    <path d="${hem}" fill="none" stroke="url(#wk-gold)" stroke-width="10" stroke-linecap="round"/>
    ${roll(left + 20)}${roll(right - 20)}
    ${lettering(title, { x: cx, y: top + (bottom - top) / 2 + size * 0.46, size })}
  </g>`;
}

/** The cream inset box, the reference's "Goals:" well. */
export function creamBox({ top, bottom, left = PANEL.left + 42, right = PANEL.right - 42 }) {
  return `<g data-part="box"><rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" rx="22" fill="${T.creamEdge}"/><rect x="${left + 4}" y="${top + 4}" width="${right - left - 8}" height="${bottom - top - 8}" rx="19" fill="${T.creamBox}"/><rect x="${left + 4}" y="${top + 4}" width="${right - left - 8}" height="12" rx="6" fill="${T.creamShade}" opacity="0.7"/></g>`;
}

/** Where the button sits, so content can stop above it. */
export const BUTTON = { width: 330, height: 80, top: PANEL.bottom - 122 };

/**
 * The reference's Play: a green glossy face in a thick gold rim, the label in
 * cream lettering with a dark green outline.
 */
function playButton(label) {
  const { width, height, top: y } = BUTTON;
  const x = PANEL_CX - width / 2;
  const size = fitSize(label, 44, width - 60);
  return `<g data-part="button">
    <rect x="${x - 11}" y="${y - 9}" width="${width + 22}" height="${height + 24}" rx="30" fill="${T.gold.edge}"/>
    <rect x="${x - 8}" y="${y - 7}" width="${width + 16}" height="${height + 18}" rx="28" fill="url(#wk-gold)"/>
    <rect x="${x}" y="${y + 6}" width="${width}" height="${height}" rx="22" fill="${T.green.lip}"/>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="22" fill="url(#wk-green)" stroke="${T.green.outline}" stroke-width="2"/>
    <rect x="${x + 16}" y="${y + 7}" width="${width - 32}" height="${Math.round(height * 0.3)}" rx="${Math.round(height * 0.15)}" fill="#FFFFFF" opacity="0.32"/>
    ${lettering(label, { x: PANEL_CX, y: y + height / 2 + size * 0.36, size, outline: T.green.outline })}
  </g>`;
}

/** The same flame as the top bar's streak pill (`FLAME` in `src/ui/icons/art.tsx`), in a 64-unit box. */
const FLAME =
  'M32 4 C35.5 13.5 47.5 19 49.5 33 C51.5 47.5 43 58 32 58 C21 58 12.5 50 13.5 38 ' +
  'C14.2 30.5 18 25.5 22.5 21.5 C22.8 27 24.8 30.2 28 31.6 C26.4 22.4 27.8 12 32 4 Z';
const FLAME_CORE =
  'M32 26.5 C34.8 33 41.5 37 41.5 45.2 C41.5 51.6 37.4 55.4 32 55.4 ' +
  'C26.6 55.4 22.5 51.6 22.5 45.6 C22.5 39.8 27.8 35.4 32 26.5 Z';

export function flame({ x, y, size, dim = false }) {
  const s = size / 64;
  const opacity = dim ? ' opacity="0.25"' : '';
  return `<g transform="translate(${x} ${y}) scale(${s})"${opacity}><path d="${FLAME}" fill="url(#wk-flame)" stroke="#8A2A06" stroke-width="2.6" stroke-linejoin="round"/><path d="${FLAME_CORE}" fill="url(#wk-core)"/><path d="M18.6 36 C18 41.5 19.8 46.5 23.4 50" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" opacity="0.75"/></g>`;
}

/**
 * A grid of result squares, ten to a row, centred on the panel and sized to
 * fit `maxHeight`: little cubes with a face and a darker lip, like the board.
 */
export function squareGrid(colors, { top, maxHeight, maxSize = 40, cx = PANEL_CX }) {
  const cells = colors.slice(0, 50);
  if (cells.length === 0) return { body: '', height: 0 };
  const perRow = Math.min(10, cells.length);
  const rows = Math.ceil(cells.length / 10);
  const gap = 7;
  const size = Math.max(14, Math.min(maxSize, Math.floor((maxHeight - (rows - 1) * gap) / rows)));
  const rowWidth = perRow * size + (perRow - 1) * gap;
  const left = cx - rowWidth / 2;
  const radius = Math.round(size * 0.24);
  const body = cells
    .map((name, i) => {
      const color = SQUARE[name];
      const x = left + (i % 10) * (size + gap);
      const y = top + Math.floor(i / 10) * (size + gap);
      return `<rect x="${x}" y="${y + 3}" width="${size}" height="${size}" rx="${radius}" fill="${color.lip}"/><rect x="${x}" y="${y}" width="${size}" height="${size - 2}" rx="${radius}" fill="${color.face}" data-square="${name}"/><rect x="${x + size * 0.18}" y="${y + size * 0.12}" width="${size * 0.64}" height="${size * 0.18}" rx="${size * 0.09}" fill="#FFFFFF" opacity="0.38"/>`;
    })
    .join('');
  return { body, height: rows * size + (rows - 1) * gap + 3 };
}

/** White letter tiles with ink lettering, the `BlockTile` look, for an invite code. */
export function letterTiles(text, { y, size = 62, cx = PANEL_CX }) {
  const letters = [...text];
  const gap = 10;
  const width = letters.length * size + (letters.length - 1) * gap;
  const left = cx - width / 2;
  return letters
    .map((letter, i) => {
      const x = left + i * (size + gap);
      return `<rect x="${x}" y="${y + 5}" width="${size}" height="${size}" rx="14" fill="${T.creamEdge}"/><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="14" fill="#FFFFFF" stroke="${T.maroon}" stroke-opacity="0.35" stroke-width="2.5"/>${inkText(letter, { x: x + size / 2, y: y + size * 0.74, size: Math.round(size * 0.66), fill: T.ink })}`;
    })
    .join('');
}

const FLUENT_DIR = new URL('../assets/fluent/', import.meta.url);
const fluentCache = new Map();

/** A Fluent 3D icon (MIT, `assets/fluent/LICENSE`) as an embedded image. */
export function fluentIcon(name, { x, y, size }) {
  if (!fluentCache.has(name)) {
    const bytes = readFileSync(fileURLToPath(new URL(`${name}.png`, FLUENT_DIR)));
    fluentCache.set(name, `data:image/png;base64,${bytes.toString('base64')}`);
  }
  return `<image x="${x}" y="${y}" width="${size}" height="${size}" href="${fluentCache.get(name)}"/>`;
}

/**
 * The whole card: sky, rays, clouds, the block logo, the cat and its speech
 * bubble on the left, and the pop-up (banner, body, `content`, button) on
 * the right. `content` is drawn on the panel, between the banner and the
 * button.
 */
export function brandCard({ title, bubble, button, content, defs = '', mood = 'idle' }) {
  const cat = mascotMarkup({ x: 70, y: 290, width: 330, mood, prefix: 'wkcat' });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${BRAND_WIDTH}" height="${BRAND_HEIGHT}" viewBox="0 0 ${BRAND_WIDTH} ${BRAND_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${gradient('wk-sky', [[0, T.skyTop], [0.62, T.skyMid], [1, T.skyBottom]])}
    ${gradient('wk-panel-red', [[0, T.red.top], [1, T.red.bottom]])}
    ${gradient('wk-cloth', [[0, '#FF5A66'], [0.5, '#EA3446'], [1, '#C21F35']])}
    ${gradient('wk-gold', [[0, T.gold.top], [0.55, T.gold.mid], [1, T.gold.bottom]])}
    ${gradient('wk-roll', [[0, T.gold.bottom], [0.45, T.gold.top], [1, T.gold.bottom]], { x2: 1, y2: 0 })}
    ${gradient('wk-green', [[0, T.green.top], [1, T.green.bottom]])}
    ${gradient('wk-flame', [[0, '#FFC94A'], [0.6, '#FF7A1A'], [1, '#D9480F']])}
    ${gradient('wk-core', [[0, '#FFFDE0'], [1, '#FFB21C']])}
    ${cat.defs}
    ${defs}
  </defs>
  <rect width="${BRAND_WIDTH}" height="${BRAND_HEIGHT}" fill="url(#wk-sky)"/>
  ${rays(840, 330)}
  ${skyClouds()}
  ${clouds()}
  ${blockLogo()}
  ${cat.body}
  ${speechBubble(bubble)}
  ${panel()}
  ${scrollBanner(title)}
  ${content}
  ${playButton(button)}
</svg>`;
}

export { T as CARD_TOKENS };
