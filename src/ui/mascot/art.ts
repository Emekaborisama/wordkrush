/**
 * The cat's drawing, read once from `cat-art.json` and checked.
 *
 * The same file draws the share cards (`server/mascot.mjs`), so the art is
 * content, not constants: it is validated when loaded rather than trusted.
 * Pure — no React, no react-native-svg — so the selection rules are tested.
 */
import raw from './cat-art.json';

export type CatMood = 'idle' | 'cheer' | 'oops';

export const CAT_MOODS: readonly CatMood[] = ['idle', 'cheer', 'oops'];

type LineCap = 'round' | 'butt' | 'square';
type LineJoin = 'round' | 'miter' | 'bevel';

type Paint = {
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  strokeLinecap?: LineCap;
  strokeLinejoin?: LineJoin;
  opacity?: number;
};

type Shape =
  | { el: 'path'; d: string }
  | { el: 'circle'; cx: number; cy: number; r: number }
  | { el: 'ellipse'; cx: number; cy: number; rx: number; ry: number };

export type ArtLayer = Shape &
  Paint & {
    /** `tail` sways on its own layer; `shadow` stays on the ground when the cat hops. */
    part: 'body' | 'tail' | 'shadow';
    moods?: readonly CatMood[];
    /** true: only mid-blink; false: only with eyes open; absent: always. */
    blink?: boolean;
  };

export type ArtGradient = { id: string; x1: number; y1: number; x2: number; y2: number; stops: ReadonlyArray<readonly [number, string]> };

export type CatArt = {
  width: number;
  height: number;
  gradients: readonly ArtGradient[];
  layers: readonly ArtLayer[];
};

function fail(message: string): never {
  throw new Error(`cat-art.json: ${message}`);
}

function record(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(`${where} is not an object`);
  return value as Record<string, unknown>;
}

function num(value: unknown, where: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${where} is not a number`);
  return value;
}

function str(value: unknown, where: string): string {
  if (typeof value !== 'string' || value.length === 0) fail(`${where} is not a string`);
  return value;
}

function optionalNum(value: unknown, where: string): number | undefined {
  return value === undefined ? undefined : num(value, where);
}

function oneOf<T extends string>(value: unknown, options: readonly T[], where: string): T {
  const found = options.find((option) => option === value);
  if (found === undefined) fail(`${where} must be one of ${options.join(', ')}`);
  return found;
}

function parseShape(layer: Record<string, unknown>, where: string): Shape {
  switch (layer.el) {
    case 'path':
      return { el: 'path', d: str(layer.d, `${where}.d`) };
    case 'circle':
      return { el: 'circle', cx: num(layer.cx, `${where}.cx`), cy: num(layer.cy, `${where}.cy`), r: num(layer.r, `${where}.r`) };
    case 'ellipse':
      return {
        el: 'ellipse',
        cx: num(layer.cx, `${where}.cx`),
        cy: num(layer.cy, `${where}.cy`),
        rx: num(layer.rx, `${where}.rx`),
        ry: num(layer.ry, `${where}.ry`),
      };
    default:
      return fail(`${where}.el must be path, circle or ellipse`);
  }
}

function parseLayer(value: unknown, index: number, gradientIds: ReadonlySet<string>): ArtLayer {
  const where = `layers[${index}]`;
  const layer = record(value, where);
  const fill = str(layer.fill, `${where}.fill`);
  const ref = /^url\(#([\w-]+)\)$/.exec(fill);
  if (ref && !gradientIds.has(ref[1])) fail(`${where}.fill names a gradient that does not exist`);
  const moods =
    layer.moods === undefined
      ? undefined
      : Array.isArray(layer.moods)
        ? layer.moods.map((mood, i) => oneOf(mood, CAT_MOODS, `${where}.moods[${i}]`))
        : fail(`${where}.moods is not a list`);
  if (layer.blink !== undefined && typeof layer.blink !== 'boolean') fail(`${where}.blink is not a boolean`);
  return {
    ...parseShape(layer, where),
    part: layer.part === undefined ? 'body' : oneOf(layer.part, ['tail', 'shadow'] as const, `${where}.part`),
    fill,
    stroke: layer.stroke === undefined ? undefined : str(layer.stroke, `${where}.stroke`),
    strokeWidth: optionalNum(layer.strokeWidth, `${where}.strokeWidth`),
    strokeLinecap: layer.strokeLinecap === undefined ? undefined : oneOf(layer.strokeLinecap, ['round', 'butt', 'square'] as const, `${where}.strokeLinecap`),
    strokeLinejoin: layer.strokeLinejoin === undefined ? undefined : oneOf(layer.strokeLinejoin, ['round', 'miter', 'bevel'] as const, `${where}.strokeLinejoin`),
    opacity: optionalNum(layer.opacity, `${where}.opacity`),
    moods,
    blink: layer.blink,
  };
}

export function parseCatArt(input: unknown): CatArt {
  const art = record(input, 'art');
  const box = Array.isArray(art.viewBox) ? art.viewBox.map((n, i) => num(n, `viewBox[${i}]`)) : fail('viewBox is missing');
  if (box.length !== 4 || box[0] !== 0 || box[1] !== 0) fail('viewBox must be [0, 0, width, height]');
  const gradients = Object.entries(record(art.gradients, 'gradients')).map(([id, value]): ArtGradient => {
    const g = record(value, `gradients.${id}`);
    const stops = Array.isArray(g.stops) ? g.stops : fail(`gradients.${id}.stops is not a list`);
    return {
      id,
      x1: num(g.x1, `gradients.${id}.x1`),
      y1: num(g.y1, `gradients.${id}.y1`),
      x2: num(g.x2, `gradients.${id}.x2`),
      y2: num(g.y2, `gradients.${id}.y2`),
      stops: stops.map((stop, i) => {
        if (!Array.isArray(stop) || stop.length !== 2) fail(`gradients.${id}.stops[${i}] is not [offset, colour]`);
        return [num(stop[0], `gradients.${id}.stops[${i}][0]`), str(stop[1], `gradients.${id}.stops[${i}][1]`)] as const;
      }),
    };
  });
  const ids = new Set(gradients.map((g) => g.id));
  const layers = Array.isArray(art.layers) ? art.layers.map((layer, i) => parseLayer(layer, i, ids)) : fail('layers is not a list');
  return { width: box[2], height: box[3], gradients, layers };
}

export const CAT_ART: CatArt = parseCatArt(raw);

/** The rule `server/mascot.mjs` applies too: does this layer belong to this face? */
export function layerShows(layer: Pick<ArtLayer, 'moods' | 'blink'>, mood: CatMood, blink: boolean): boolean {
  if (layer.moods && !layer.moods.includes(mood)) return false;
  if (layer.blink !== undefined && layer.blink !== blink) return false;
  return true;
}

export function layersFor(art: CatArt, part: ArtLayer['part'], mood: CatMood, blink: boolean): ArtLayer[] {
  return art.layers.filter((layer) => layer.part === part && layerShows(layer, mood, blink));
}
