/**
 * Lettering as outlines, read straight from a TrueType font file.
 *
 * The share cards used to set their words as SVG `<text>` and trust the
 * rasteriser to find the face through fontconfig. That held on Railway and
 * failed everywhere else: on macOS the same card came out in Helvetica or
 * Times, so nobody could judge a card before it shipped. Drawing each glyph's
 * own contours makes the card the same bytes on every machine, with no font
 * install step to go wrong.
 *
 * A minimal reader, enough for the static `glyf` TTFs in `@expo-google-fonts`:
 * `cmap` format 4, `hmtx` advances, simple and composite glyphs. No kerning
 * (that lives in GPOS) and no shaping, which display lettering in Latin does
 * not need. Pure apart from reading the file once.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FONT_ROOT = new URL('../node_modules/@expo-google-fonts/', import.meta.url);

/** The faces the cards may use, by the name a card asks for. */
export const CARD_FACES = {
  /** Rounded display face, the free stand-in for Treasure Match's Mikado. */
  display: 'fredoka/700Bold/Fredoka_700Bold.ttf',
  /** The app's headline face (`font.black`). */
  headline: 'exo-2/900Black/Exo2_900Black.ttf',
};

function tables(buf) {
  const count = buf.readUInt16BE(4);
  const found = {};
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16;
    found[buf.toString('latin1', at, at + 4)] = { offset: buf.readUInt32BE(at + 8), length: buf.readUInt32BE(at + 12) };
  }
  for (const tag of ['cmap', 'head', 'hhea', 'hmtx', 'loca', 'glyf', 'maxp']) {
    if (!found[tag]) throw new Error(`font has no ${tag} table`);
  }
  return found;
}

/** Character code → glyph index, from the Windows Unicode BMP subtable (format 4). */
function readCmap(buf, { offset }) {
  const subtables = buf.readUInt16BE(offset + 2);
  for (let i = 0; i < subtables; i++) {
    const at = offset + 4 + i * 8;
    const platform = buf.readUInt16BE(at);
    const encoding = buf.readUInt16BE(at + 2);
    const sub = offset + buf.readUInt32BE(at + 4);
    if (platform !== 3 || encoding !== 1 || buf.readUInt16BE(sub) !== 4) continue;
    const segments = buf.readUInt16BE(sub + 6) / 2;
    const ends = sub + 14;
    const starts = ends + segments * 2 + 2;
    const deltas = starts + segments * 2;
    const ranges = deltas + segments * 2;
    const map = new Map();
    for (let s = 0; s < segments; s++) {
      const end = buf.readUInt16BE(ends + s * 2);
      const start = buf.readUInt16BE(starts + s * 2);
      const delta = buf.readInt16BE(deltas + s * 2);
      const rangeAt = ranges + s * 2;
      const range = buf.readUInt16BE(rangeAt);
      for (let code = start; code <= end && code !== 0xffff; code++) {
        let glyph;
        if (range === 0) {
          glyph = (code + delta) & 0xffff;
        } else {
          const index = buf.readUInt16BE(rangeAt + range + (code - start) * 2);
          glyph = index === 0 ? 0 : (index + delta) & 0xffff;
        }
        if (glyph !== 0) map.set(code, glyph);
      }
    }
    return map;
  }
  throw new Error('font has no Unicode BMP cmap');
}

function loadFont(file) {
  const buf = readFileSync(fileURLToPath(new URL(file, FONT_ROOT)));
  const t = tables(buf);
  const unitsPerEm = buf.readUInt16BE(t.head.offset + 18);
  const longLoca = buf.readInt16BE(t.head.offset + 50) === 1;
  const glyphCount = buf.readUInt16BE(t.maxp.offset + 4);
  const metricCount = buf.readUInt16BE(t.hhea.offset + 34);
  const ascender = buf.readInt16BE(t.hhea.offset + 4);
  const descender = buf.readInt16BE(t.hhea.offset + 6);

  const advance = (glyph) => buf.readUInt16BE(t.hmtx.offset + Math.min(glyph, metricCount - 1) * 4);
  const glyphRange = (glyph) => {
    if (glyph >= glyphCount) return null;
    const start = longLoca ? buf.readUInt32BE(t.loca.offset + glyph * 4) : buf.readUInt16BE(t.loca.offset + glyph * 2) * 2;
    const end = longLoca ? buf.readUInt32BE(t.loca.offset + glyph * 4 + 4) : buf.readUInt16BE(t.loca.offset + glyph * 2 + 2) * 2;
    return end > start ? t.glyf.offset + start : null;
  };

  /** Contours of one glyph in font units, each a list of `{x, y, on}`. */
  const contours = (glyph, depth = 0) => {
    const at = glyphRange(glyph);
    if (at === null) return [];
    const contourCount = buf.readInt16BE(at);
    if (contourCount >= 0) return simpleGlyph(buf, at, contourCount);
    if (depth > 4) return [];
    return compositeGlyph(buf, at, (part) => contours(part, depth + 1));
  };

  return { unitsPerEm, ascender, descender, cmap: readCmap(buf, t.cmap), advance, contours };
}

function simpleGlyph(buf, at, contourCount) {
  let p = at + 10;
  const ends = [];
  for (let i = 0; i < contourCount; i++, p += 2) ends.push(buf.readUInt16BE(p));
  const pointCount = contourCount ? ends[contourCount - 1] + 1 : 0;
  p += 2 + buf.readUInt16BE(p);
  const flags = [];
  while (flags.length < pointCount) {
    const flag = buf.readUInt8(p++);
    flags.push(flag);
    if (flag & 8) {
      const repeat = buf.readUInt8(p++);
      for (let r = 0; r < repeat; r++) flags.push(flag);
    }
  }
  const read = (short, same) => {
    const values = [];
    let value = 0;
    for (const flag of flags) {
      if (flag & short) {
        const delta = buf.readUInt8(p++);
        value += flag & same ? delta : -delta;
      } else if (!(flag & same)) {
        value += buf.readInt16BE(p);
        p += 2;
      }
      values.push(value);
    }
    return values;
  };
  const xs = read(2, 16);
  const ys = read(4, 32);
  const out = [];
  let start = 0;
  for (const end of ends) {
    const contour = [];
    for (let i = start; i <= end; i++) contour.push({ x: xs[i], y: ys[i], on: (flags[i] & 1) === 1 });
    out.push(contour);
    start = end + 1;
  }
  return out;
}

function compositeGlyph(buf, at, partContours) {
  let p = at + 10;
  const out = [];
  let more = true;
  while (more) {
    const flags = buf.readUInt16BE(p);
    const part = buf.readUInt16BE(p + 2);
    p += 4;
    let dx = 0;
    let dy = 0;
    if (flags & 1) {
      dx = buf.readInt16BE(p);
      dy = buf.readInt16BE(p + 2);
      p += 4;
    } else {
      dx = buf.readInt8(p);
      dy = buf.readInt8(p + 1);
      p += 2;
    }
    let a = 1, b = 0, c = 0, d = 1;
    const f2dot14 = (o) => buf.readInt16BE(o) / 16384;
    if (flags & 8) {
      a = d = f2dot14(p);
      p += 2;
    } else if (flags & 0x40) {
      a = f2dot14(p);
      d = f2dot14(p + 2);
      p += 4;
    } else if (flags & 0x80) {
      a = f2dot14(p);
      b = f2dot14(p + 2);
      c = f2dot14(p + 4);
      d = f2dot14(p + 6);
      p += 8;
    }
    // Only offset-positioned parts (flag 2), which is what accents use.
    if (!(flags & 2)) {
      dx = 0;
      dy = 0;
    }
    for (const contour of partContours(part)) {
      out.push(contour.map((pt) => ({ x: a * pt.x + c * pt.y + dx, y: b * pt.x + d * pt.y + dy, on: pt.on })));
    }
    more = (flags & 0x20) !== 0;
  }
  return out;
}

const fonts = new Map();

function face(name) {
  const file = CARD_FACES[name];
  if (!file) throw new Error(`unknown card face ${name}`);
  if (!fonts.has(name)) fonts.set(name, loadFont(file));
  return fonts.get(name);
}

const fmt = (n) => Number(n.toFixed(1));

/** One TrueType contour as SVG path commands: quadratic, with implied on-curve midpoints. */
function contourPath(points, place) {
  if (points.length === 0) return '';
  const n = points.length;
  const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, on: true });
  const firstOn = points.findIndex((pt) => pt.on);
  const start = firstOn === -1 ? mid(points[0], points[1 % n]) : points[firstOn];
  const from = firstOn === -1 ? 0 : firstOn;
  const [sx, sy] = place(start);
  let d = `M${fmt(sx)} ${fmt(sy)}`;
  for (let i = 1; i <= n; i++) {
    const cur = points[(from + i) % n];
    if (cur.on) {
      const [x, y] = place(cur);
      d += `L${fmt(x)} ${fmt(y)}`;
      continue;
    }
    const next = points[(from + i + 1) % n];
    const end = next.on ? next : mid(cur, next);
    const [cx, cy] = place(cur);
    const [ex, ey] = place(end);
    d += `Q${fmt(cx)} ${fmt(cy)} ${fmt(ex)} ${fmt(ey)}`;
    if (next.on) i++;
  }
  return `${d}Z`;
}

/** Width of `text` at `size` px, in px. */
export function measureText(text, { face: name = 'display', size, tracking = 0 }) {
  const font = face(name);
  const scale = size / font.unitsPerEm;
  const chars = [...text];
  const glyphs = chars.map((ch) => glyphFor(font, ch, text));
  return glyphs.reduce((sum, g) => sum + font.advance(g) * scale, 0) + tracking * Math.max(0, chars.length - 1);
}

function glyphFor(font, ch, text) {
  const glyph = font.cmap.get(ch.codePointAt(0));
  if (glyph === undefined) throw new Error(`no glyph for ${JSON.stringify(ch)} in ${JSON.stringify(text)}`);
  return glyph;
}

/**
 * `text` as one SVG path `d`, baseline at `y`, anchored at `x` (start,
 * middle or end). Throws on a character the face does not have, so a card
 * can never draw a `.notdef` box: the suite renders every card.
 */
export function textPath(text, { face: name = 'display', size, x, y, anchor = 'middle', tracking = 0 }) {
  const font = face(name);
  const scale = size / font.unitsPerEm;
  const width = measureText(text, { face: name, size, tracking });
  let pen = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2;
  let d = '';
  for (const ch of text) {
    const glyph = glyphFor(font, ch, text);
    const left = pen;
    const place = (pt) => [left + pt.x * scale, y - pt.y * scale];
    for (const contour of font.contours(glyph)) d += contourPath(contour, place);
    pen += font.advance(glyph) * scale + tracking;
  }
  return { d, width };
}

/** Cap height-ish: how far above the baseline capitals reach, in px. */
export function capHeight(name, size) {
  const font = face(name);
  return (font.ascender / font.unitsPerEm) * size * 0.72;
}
