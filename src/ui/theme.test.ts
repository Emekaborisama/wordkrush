import { describe, expect, it } from 'vitest';
import {
  brand,
  contrastRatio,
  font,
  gloss,
  motion,
  palette,
  pill,
  proximityColor,
  readableWhiteFace,
  reward,
  screen,
  shade,
  theme,
  tint,
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
    expect(theme.bg).toBe(palette.sand);
    expect(theme.bg).not.toBe(brand.ink);
    expect(theme.text).toBe(palette.brown);
    expect(screen.page.backgroundColor).toBe(palette.sand);
    expect(screen.playfield.backgroundColor).toBe(palette.wood);
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

describe('contrastRatio', () => {
  it('matches the WCAG ends of the scale', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('clears 4.5:1 for the chrome pairs under 18px', () => {
    expect(contrastRatio(palette.brown, palette.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.brown, palette.sand)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.paper, palette.wood)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.white, pill.green.face)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.white, tint(pill.green.face, gloss.alpha))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.brown, palette.ribbon)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.textMuted, theme.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.textMuted, theme.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.text, theme.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.white, palette.purple)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.brown, palette.star)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('casual chrome', () => {
  it('names the owner hexes and keeps reward gold on the star, not a new brand', () => {
    expect(palette.sand).toBe('#F4E4C4');
    expect(palette.wood).toBe('#6B3E26');
    expect(palette.plank).toBe('#8B5A2B');
    expect(palette.paper).toBe('#FFF8EE');
    expect(palette.brown).toBe('#3A2415');
    expect(palette.green).toBe('#3DCC4A');
    expect(palette.greenBevel).toBe('#1E8A28');
    expect(palette.purple).toBe('#7B4FD6');
    expect(palette.blue).toBe('#2F9BFF');
    expect(palette.coral).toBe('#FF5A7A');
    expect(palette.ribbon).toBe('#FFC83D');
    expect(palette.star).toBe('#FFC107');
    expect(reward.gold).toBe(palette.star);
    expect(reward.outline).toBe(palette.brown);
    expect(reward.xp).toBe(palette.purple);
  });

  it('deepens a bright green until a white label survives the gloss', () => {
    // White on the owner green is about 2.11:1. The pill face is a shade of it.
    expect(contrastRatio(palette.white, palette.green)).toBeLessThan(4.5);
    const face = readableWhiteFace(palette.green);
    expect(face).not.toBe(palette.green);
    expect(contrastRatio(palette.white, face)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.white, tint(face, gloss.alpha))).toBeGreaterThanOrEqual(4.5);
    expect(pill.green.label).toBe(palette.white);
    expect(pill.ribbon.label).toBe(palette.brown);
    expect(pill.ribbon.face).toBe(palette.ribbon);
  });

  it('publishes the motion and depth tokens', () => {
    expect(motion.pressMs).toBe(70);
    expect(motion.popMs).toBe(260);
    expect(motion.staggerMs).toBe(140);
    expect(motion.countXpMs).toBe(900);
    expect(motion.rayPeriodMs).toBe(20000);
    expect(motion.shakeMs).toBe(320);
    expect(motion.coinFlyMs).toBe(650);
    expect(gloss.alpha).toBe(0.18);
    expect(gloss.height).toBe(0.46);
    expect(type.displayXL.fontSize).toBe(44);
    expect(type.displayXL.letterSpacing).toBe(-1);
    expect(type.overline.fontSize).toBeGreaterThanOrEqual(11);
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
