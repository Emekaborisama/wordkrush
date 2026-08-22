import { describe, expect, it } from 'vitest';
import { brand, font, proximityColor, theme, type, withAlpha } from './theme';

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
  it('keeps the umbrella accent on lockup gold', () => {
    expect(theme.accent).toBe(brand.krush);
    expect(theme.bg).toBe(brand.ink);
    expect(theme.text).toBe(brand.word);
    expect(theme.accentSecondary).toBe(brand.purple);
  });
});

describe('type scale', () => {
  it('gives display sizes negative tracking', () => {
    // Large text at default spacing is the most common typography tell.
    expect(type.display.letterSpacing).toBeLessThan(0);
    expect(type.title.letterSpacing).toBeLessThan(0);
  });

  it('gives small-caps labels positive tracking', () => {
    expect(type.overline.letterSpacing).toBeGreaterThan(1);
  });

  it('keeps line height comfortably above font size for body copy', () => {
    expect(type.body.lineHeight / type.body.fontSize).toBeGreaterThan(1.35);
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

describe('type scale typeface (D-030)', () => {
  const FACES: string[] = Object.values(font);

  it('names a bundled Fredoka face on every tier, body and caption included', () => {
    for (const [tier, style] of Object.entries(type)) {
      expect(FACES, `${tier} must use a bundled face`).toContain(
        (style as { fontFamily?: string }).fontFamily,
      );
    }
  });

  it('only ever names faces that App.tsx actually loads', () => {
    // Fredoka ships 300/400 too; loading is limited to 500/600/700, so naming
    // an unloaded face would silently fall back to the system typeface.
    expect(FACES.sort()).toEqual(
      ['Fredoka_500Medium', 'Fredoka_600SemiBold', 'Fredoka_700Bold'].sort(),
    );
  });
});
