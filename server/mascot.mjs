/**
 * The mascot as SVG markup, for the share cards.
 *
 * The drawing is data (`src/ui/mascot/cat-art.json`), read here and by
 * `src/ui/mascot/Mascot.tsx`, so the cat on a card in someone's timeline is
 * the cat the player saw in the app. Nothing here is a second copy of the art.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ART = JSON.parse(
  readFileSync(fileURLToPath(new URL('../src/ui/mascot/cat-art.json', import.meta.url)), 'utf-8'),
);

export const MASCOT_MOODS = ['idle', 'cheer', 'oops'];

const [, , VIEW_W, VIEW_H] = ART.viewBox;
export const MASCOT_ASPECT = VIEW_H / VIEW_W;

const ATTRS = {
  d: 'd',
  cx: 'cx',
  cy: 'cy',
  r: 'r',
  rx: 'rx',
  ry: 'ry',
  x: 'x',
  y: 'y',
  width: 'width',
  height: 'height',
  fill: 'fill',
  stroke: 'stroke',
  strokeWidth: 'stroke-width',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  opacity: 'opacity',
};

/** True when `layer` belongs in the drawing for this mood and blink state. */
export function layerShows(layer, mood, blink) {
  if (layer.moods && !layer.moods.includes(mood)) return false;
  if (layer.blink !== undefined && layer.blink !== blink) return false;
  return true;
}

function element(layer, prefix) {
  const attrs = Object.entries(ATTRS)
    .filter(([key]) => layer[key] !== undefined)
    .map(([key, name]) => {
      const value = String(layer[key]).replace(/url\(#([\w-]+)\)/, `url(#${prefix}-$1)`);
      return `${name}="${value}"`;
    })
    .join(' ');
  return `<${layer.el} ${attrs}/>`;
}

function gradients(prefix) {
  return Object.entries(ART.gradients)
    .map(([id, g]) => {
      const stops = g.stops.map(([offset, color]) => `<stop offset="${offset}" stop-color="${color}"/>`).join('');
      return `<linearGradient id="${prefix}-${id}" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}">${stops}</linearGradient>`;
    })
    .join('');
}

/**
 * The cat, `width` wide with its top-left corner at (`x`, `y`), as one `<g>`
 * plus the gradients it needs (put them in the card's `<defs>`). `prefix`
 * keeps two cats on one card from sharing gradient ids.
 */
export function mascotMarkup({ x = 0, y = 0, width = VIEW_W, mood = 'idle', prefix = 'wkcat', flip = false }) {
  const scale = width / VIEW_W;
  const layers = ART.layers.filter((layer) => layerShows(layer, mood, false));
  const mirror = flip ? ` translate(${VIEW_W} 0) scale(-1 1)` : '';
  return {
    defs: gradients(prefix),
    body: `<g transform="translate(${x} ${y}) scale(${scale})${mirror}">${layers.map((layer) => element(layer, prefix)).join('')}</g>`,
  };
}

/** A standalone SVG document of the cat, for previews and tests. */
export function mascotSvgDocument({ width = VIEW_W, mood = 'idle' } = {}) {
  const height = Math.round(width * MASCOT_ASPECT);
  const { defs, body } = mascotMarkup({ width, mood });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${defs}</defs>${body}</svg>`;
}
