import { describe, expect, it } from 'vitest';
import {
  brand,
  contrastRatio,
  cube,
  font,
  gloss,
  kit,
  motion,
  palette,
  proximityColor,
  reward,
  screen,
  shade,
  theme,
  tint,
  tone,
  toneForPill,
  toneFrom,
  type,
  withAlpha,
} from './theme';

/** hsl(H, S%, L%) -> [h, s, l] */
function parseHsl(css: string): [number, number, number] {
  const m = css.match(/^hsl\((\d+), (\d+)%, (\d+)%\)$/);
  if (!m) throw new Error(`not an hsl string: ${css}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

describe('proximityColor', () => {
  it('returns valid hsl across the whole range', () => {
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const [h, s, l] = parseHsl(proximityColor(t));
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(360);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
      expect(l).toBeGreaterThanOrEqual(0);
      expect(l).toBeLessThanOrEqual(100);
    }
  });

  it('clamps out-of-range input rather than producing nonsense', () => {
    expect(() => parseHsl(proximityColor(-5))).not.toThrow();
    expect(() => parseHsl(proximityColor(99))).not.toThrow();
    expect(proximityColor(-5)).toBe(proximityColor(0));
    expect(proximityColor(99)).toBe(proximityColor(1));
  });

  it('runs cold (blue) at the bottom and hot (green) at the top', () => {
    const [coldHue] = parseHsl(proximityColor(0));
    const [hotHue] = parseHsl(proximityColor(1));
    expect(coldHue).toBeGreaterThan(180); // blue end
    expect(hotHue).toBeGreaterThan(100);
    expect(hotHue).toBeLessThan(180); // green end
  });

  it('passes through red and amber in between', () => {
    const [red] = parseHsl(proximityColor(0.45));
    const [amber] = parseHsl(proximityColor(0.78));
    expect(red).toBeLessThan(15);
    expect(amber).toBeGreaterThan(30);
    expect(amber).toBeLessThan(60);
  });

  it('is continuous — no visible jump at the segment boundaries', () => {
    // Bucketed colour is the thing this replaced; a big delta across a
    // boundary would reintroduce exactly that banding.
    for (const edge of [0.45, 0.78]) {
      const [before] = parseHsl(proximityColor(edge - 0.005));
      const [after] = parseHsl(proximityColor(edge + 0.005));
      expect(Math.abs(after - before)).toBeLessThan(6);
    }
  });

  it('desaturates the coldest end so a bad guess never shouts', () => {
    const [, coldSat] = parseHsl(proximityColor(0));
    const [, hotSat] = parseHsl(proximityColor(1));
    expect(coldSat).toBeLessThan(hotSat);
  });
});


describe('brand tokens', () => {
  it('keeps the lockup hexes and does not use them as the screen canvas', () => {
    expect(brand.ink).toBe('#0A0817');
    expect(brand.word).toBe('#FFF9F6');
    expect(brand.krush).toBe('#FFB020');
    expect(brand.krushHot).toBe('#FF8C00');
    expect(brand.purple).toBe('#8B6BFF');
    expect(brand.purpleDeep).toBe('#2E0854');
    expect(theme.bg).not.toBe(brand.ink);
    expect(screen.page.backgroundColor).toBe(palette.skyMid);
    expect(screen.playfield.backgroundColor).toBe(palette.playTop);
  });
});

describe('Block Blast kit', () => {
  it('names the five main colours exactly as the kit does', () => {
    expect(kit).toEqual({
      coral: '#F15D70',
      sky: '#6BB9E0',
      cream: '#FFE1BE',
      green: '#62AC25',
      teal: '#2DADBD',
    });
    expect(palette.coral).toBe(kit.coral);
    expect(palette.teal).toBe(kit.teal);
  });

  it('lights every glossy face from the top: top lighter than foot, lip and outline darker', () => {
    const lum = (hex: string) => contrastRatio(hex, '#000000');
    for (const [name, face] of Object.entries(tone)) {
      expect(lum(face.top), `${name} top`).toBeGreaterThan(lum(face.bottom));
      expect(lum(face.lip), `${name} lip`).toBeLessThan(lum(face.bottom));
      expect(lum(face.outline), `${name} outline`).toBeLessThan(lum(face.lip));
    }
  });

  it('strokes white labels in a shade that clears 4.5:1 against them', () => {
    // Labels on glossy faces are white with an outline in `tone.*.outline`; the
    // outline is what separates the glyph from a pale face.
    for (const [name, face] of Object.entries(tone)) {
      expect(contrastRatio(palette.white, face.outline), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('derives a glossy tone from any accent hex', () => {
    const derived = toneFrom('#9B78FF');
    expect(derived.bottom).toBe('#9B78FF');
    expect(derived.top).toBe(tint('#9B78FF', 0.42));
    expect(derived.lip).toBe(shade('#9B78FF', 0.3));
  });

  it('maps every legacy pill name onto a kit tone', () => {
    expect(toneForPill('green')).toBe('green');
    expect(toneForPill('coral')).toBe('red');
    expect(toneForPill('ribbon')).toBe('gold');
  });

  it('keeps cubes distinct from each other', () => {
    const faces = Object.values(cube);
    expect(new Set(faces).size).toBe(faces.length);
  });
});

describe('contrastRatio', () => {
  it('matches the WCAG ends of the scale', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('clears 4.5:1 for every small-text pair the kit uses', () => {
    // Navy and soft navy ink on cream boxes, white, and the pale board well.
    for (const ground of [palette.cream, palette.creamFill, palette.creamShade, palette.white, palette.well]) {
      expect(contrastRatio(theme.text, ground), `text on ${ground}`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(theme.textMuted, ground), `muted on ${ground}`).toBeGreaterThanOrEqual(4.5);
    }
    // Teal labels (Music / SFX) on cream.
    expect(contrastRatio(palette.tealInk, palette.creamFill)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.tealInk, palette.cream)).toBeGreaterThanOrEqual(4.5);
    // White copy on the deep end of the coral panel and on the night sky.
    expect(contrastRatio(palette.white, palette.coralEdge)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.white, palette.navy)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('reward and motion tokens', () => {
  it('keeps reward gold on the kit gold, not a new brand', () => {
    expect(reward.gold).toBe(palette.gold);
    expect(reward.xp).toBe(palette.purple);
    expect(reward.starOff).toBe(palette.coralEdge);
  });

  it('publishes the motion and depth tokens', () => {
    expect(motion.pressMs).toBe(70);
    expect(motion.popMs).toBe(260);
    expect(motion.staggerMs).toBe(140);
    expect(motion.countXpMs).toBe(900);
    expect(motion.shakeMs).toBe(320);
    expect(motion.coinFlyMs).toBe(650);
    expect(gloss.alpha).toBeGreaterThan(0);
    expect(gloss.height).toBeLessThan(1);
    expect(type.overline.fontSize).toBeGreaterThanOrEqual(11);
  });
});

describe('type scale', () => {
  it('tightens the largest display sizes', () => {
    expect(type.hero.letterSpacing).toBeLessThan(0);
    expect(type.display.letterSpacing).toBeLessThanOrEqual(0);
  });

  it('gives small labels positive tracking', () => {
    expect(type.overline.letterSpacing).toBeGreaterThan(1);
  });

  it('keeps line height comfortably above font size for body copy', () => {
    expect(type.body.lineHeight / type.body.fontSize).toBeGreaterThan(1.35);
  });

  it('never sets fontWeight, which fakes a bolder face on web', () => {
    for (const [tier, style] of Object.entries(type)) {
      expect(style, tier).not.toHaveProperty('fontWeight');
    }
  });
});

describe('shade and tint', () => {
  it('mixes toward black and white and clamps', () => {
    expect(shade('#FF0000', 0)).toBe('#FF0000');
    expect(shade('#FF0000', 1)).toBe('#000000');
    expect(shade('#FF0000', 0.5)).toBe('#800000');
    expect(tint('#000000', 0)).toBe('#000000');
    expect(tint('#000000', 1)).toBe('#FFFFFF');
    expect(tint('#000000', 0.5)).toBe('#808080');
    expect(shade('#FF0000', 5)).toBe('#000000');
    expect(tint('#000000', -2)).toBe('#000000');
  });
});


describe('withAlpha', () => {
  it('appends a hex alpha pair to a hex colour', () => {
    expect(withAlpha('#FF5D8F', 1)).toBe('#FF5D8Fff');
    expect(withAlpha('#FF5D8F', 0)).toBe('#FF5D8F00');
    expect(withAlpha('#FF5D8F', 0.16)).toBe('#FF5D8F29');
  });

  it('clamps out-of-range alpha', () => {
    expect(withAlpha('#FF5D8F', 5)).toBe('#FF5D8Fff');
    expect(withAlpha('#FF5D8F', -5)).toBe('#FF5D8F00');
  });

  // A hex suffix on `hsl(...)` is an INVALID colour that renders opaque rather
  // than throwing, which silently made guess-row rank text match its own pill.
  it('converts proximity hsl colours to hsla instead of concatenating hex', () => {
    const tinted = withAlpha(proximityColor(0), 0.16);
    expect(tinted).toMatch(/^hsla\(\d+, \d+%, \d+%, 0\.16\)$/);
    expect(tinted).not.toMatch(/\)[0-9a-f]{2}$/);
  });

  it('keeps every proximity colour tintable across the range', () => {
    for (let t = 0; t <= 1.0001; t += 0.05) {
      expect(withAlpha(proximityColor(t), 0.44)).toMatch(/^hsla\(/);
    }
  });
});

describe('type scale typeface (Exo 2)', () => {
  const FACES: string[] = Object.values(font);

  it('names a bundled Exo 2 face on every tier, body and caption included', () => {
    for (const [tier, style] of Object.entries(type)) {
      expect(FACES, `${tier} must use a bundled face`).toContain(
        (style as { fontFamily?: string }).fontFamily,
      );
    }
  });

  it('only ever names faces that App.tsx actually loads', () => {
    // Naming an unloaded face would silently fall back to the system typeface.
    expect([...new Set(FACES)].sort()).toEqual(
      ['Exo2_600SemiBold', 'Exo2_700Bold', 'Exo2_800ExtraBold', 'Exo2_900Black'].sort(),
    );
  });
});
