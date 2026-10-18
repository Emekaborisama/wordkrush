import { memo, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import {
  capLift,
  cubeHex,
  cubeShades,
  desaturate,
  exoLineHeight,
  prefersDarkInk,
  tileMetrics,
} from '../blockMath';
import { strokeOffsets } from '../shapes';
import { cube, font, palette, withAlpha, type CubeColor } from '../theme';

export type BlockTileState = 'normal' | 'selected' | 'dim' | 'empty';

export type BlockTileProps = {
  /** Outer size in px, lip included, so tiles grid without extra maths. */
  size: number;
  /** A `cube` key or a raw hex. Ignored when `state` is selected or empty. */
  color?: CubeColor | string;
  /** One or two characters, drawn uppercase. */
  letter?: string;
  /** The round LEGO stud. Defaults to on when there is no letter. */
  stud?: boolean;
  state?: BlockTileState;
  style?: StyleProp<ViewStyle>;
  /** Give one when the tile itself carries meaning and no parent labels it. */
  accessibilityLabel?: string;
  /** Overlay slot centred on the face, e.g. a special-tile glyph. */
  children?: ReactNode;
};

const HIDDEN = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/**
 * The light-top gradient as stacked translucent bands (fractions of the face
 * from the top). Views cannot paint a gradient on web and native alike, and
 * small steps read as one smooth ramp.
 */
const GLOSS_STEPS = [0.62, 0.47, 0.32, 0.17] as const;
/** Big cubes show the steps, so they get twice as many, half as strong. */
const GLOSS_STEPS_FINE = [0.64, 0.56, 0.48, 0.4, 0.32, 0.24, 0.16, 0.08] as const;
/** The same idea at the foot: the face darkens into the lip. */
const SHADE_STEPS = [0.2, 0.1] as const;

/**
 * The kit's glossy studded cube. Plain Views only: a Wordfall board renders
 * about fifty of these, and SVG per cell would cost a native view tree each.
 * Layers, back to front: lip (with the dark rim), face with its lighter top,
 * the stud's darker side, the stud cap, the cap's highlight arc, a gloss dot,
 * then the letter.
 */
function BlockTileView({
  size,
  color = 'cream',
  letter,
  stud,
  state = 'normal',
  style,
  accessibilityLabel,
  children,
}: BlockTileProps) {
  const glyph = (letter ?? '').trim().toUpperCase().slice(0, 2);
  const m = tileMetrics(size, glyph.length);
  const a11y = accessibilityLabel
    ? { accessible: true, accessibilityRole: 'text' as const, accessibilityLabel }
    : null;

  if (state === 'empty') {
    return (
      <View {...a11y} style={[{ width: size, height: size, borderRadius: m.radius }, styles.empty, style]}>
        <View
          {...HIDDEN}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { borderRadius: m.radius }, styles.clip]}
        >
          <View style={[styles.emptyShade, { height: Math.max(2, size * 0.16) }]} />
        </View>
        {glyph ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
            <TileLetter glyph={glyph} size={m.letterSize} fill={withAlpha(palette.ink, 0.35)} />
          </View>
        ) : null}
        {children ? (
          <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.center]}>
            {children}
          </View>
        ) : null}
      </View>
    );
  }

  const selected = state === 'selected';
  const dim = state === 'dim';
  const base = selected ? cube.gold : cubeHex(color);
  const shades = cubeShades(dim ? desaturate(base, 0.55) : base);
  const showStud = (stud ?? glyph.length === 0) && m.stud > 0;
  const faceH = size - m.lip - m.rim;
  const faceRadius = Math.max(0, m.radius - m.rim);
  const faceBox: ViewStyle = { position: 'absolute', left: m.rim, right: m.rim, top: m.rim, height: faceH };
  const darkInk = !selected && prefersDarkInk(shades.face);
  const highlight = Math.max(1, size * 0.035);
  const fine = size >= 64;

  // Stud, centred on the face and nudged up by half its visible side.
  const studLeft = (size - m.stud) / 2;
  const studTop = m.rim + (faceH - m.stud - m.studDrop) / 2;
  const lightSize = m.stud * 0.78;

  const glow = Math.max(2, size * 0.09);

  return (
    <View {...a11y} style={[{ width: size, height: size }, dim && styles.dim, style]}>
      {selected ? (
        <View
          {...HIDDEN}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -glow,
            top: -glow,
            right: -glow,
            bottom: -glow,
            borderRadius: m.radius + glow,
            borderWidth: Math.max(1.5, size * 0.045),
            borderColor: withAlpha('#FFF5BF', 0.95),
            backgroundColor: withAlpha(palette.gold, 0.4),
            boxShadow: `0px 0px ${Math.round(size * 0.32)}px ${Math.round(size * 0.05)}px ${withAlpha(palette.gold, 0.85)}`,
          }}
        />
      ) : null}
      <View {...HIDDEN} pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: m.radius,
              backgroundColor: shades.lip,
              borderWidth: m.rim,
              borderColor: shades.rim,
            },
          ]}
        />
        <View style={[faceBox, styles.clip, { borderRadius: faceRadius, backgroundColor: shades.face }]}>
          {(fine ? GLOSS_STEPS_FINE : GLOSS_STEPS).map((step) => (
            <View
              key={step}
              style={[
                styles.band,
                { height: faceH * step, backgroundColor: withAlpha(palette.white, fine ? 0.028 : 0.055) },
              ]}
            />
          ))}
          {SHADE_STEPS.map((step) => (
            <View
              key={step}
              style={[styles.foot, { height: faceH * step, backgroundColor: withAlpha(shades.lip, 0.2) }]}
            />
          ))}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: faceRadius * 0.55,
              right: faceRadius * 0.55,
              height: highlight,
              borderRadius: highlight,
              backgroundColor: withAlpha(palette.white, 0.55),
            }}
          />
        </View>
        {showStud ? (
          <>
            <View
              style={[
                styles.round,
                {
                  left: studLeft + m.studDrop * 0.35,
                  top: studTop + m.studDrop,
                  width: m.stud,
                  height: m.stud,
                  backgroundColor: shades.studSide,
                  boxShadow: `${round1(m.studDrop * 0.5)}px ${round1(m.studDrop * 0.9)}px ${round1(m.studDrop * 1.8)}px ${withAlpha(shades.studShadow, 0.4)}`,
                },
              ]}
            />
            <View
              style={[
                styles.round,
                styles.clip,
                { left: studLeft, top: studTop, width: m.stud, height: m.stud, backgroundColor: shades.studCap },
              ]}
            >
              <View
                style={[
                  styles.round,
                  {
                    left: m.stud * 0.05,
                    top: m.stud * 0.04,
                    width: lightSize,
                    height: lightSize,
                    backgroundColor: shades.studLight,
                  },
                ]}
              />
            </View>
          </>
        ) : null}
        {m.dot > 0 ? (
          <View
            style={[
              styles.round,
              {
                left: m.rim + size * 0.1,
                top: m.rim + size * 0.085,
                width: m.dot,
                height: m.dot,
                backgroundColor: withAlpha(palette.white, 0.85),
              },
            ]}
          />
        ) : null}
      </View>
      {glyph ? (
        <View pointerEvents="none" style={[faceBox, styles.center]}>
          {darkInk ? (
            <TileLetter glyph={glyph} size={m.letterSize} fill={dim ? palette.inkSoft : palette.ink} />
          ) : (
            <TileLetter
              glyph={glyph}
              size={m.letterSize}
              fill={palette.white}
              outline={shades.ink}
              stroke={m.letterStroke}
              foot={m.letterFoot}
            />
          )}
        </View>
      ) : null}
      {children ? (
        <View pointerEvents="box-none" style={[faceBox, styles.center]}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

type TileLetterProps = {
  glyph: string;
  size: number;
  fill: string;
  /** When set, the letter is outlined with a ring of copies plus a foot. */
  outline?: string;
  stroke?: number;
  foot?: number;
};

/**
 * One centred glyph. Navy on cream is a single Text; white on colour adds a
 * cheap ring (eight copies at 1–2px) and one copy below for the kit's thick
 * foot, rather than StrokeText's eleven, because a board draws dozens.
 */
function TileLetter({ glyph, size, fill, outline, stroke = 1, foot = 1 }: TileLetterProps) {
  const text: TextStyle = {
    fontFamily: font.black,
    fontSize: size,
    lineHeight: exoLineHeight(size),
    textAlign: 'center',
    includeFontPadding: false,
  };
  const lift = { transform: [{ translateY: capLift(size) }] };
  if (!outline) {
    return (
      <Text selectable={false} style={[text, lift, { color: fill }]}>
        {glyph}
      </Text>
    );
  }
  const copies = [...strokeOffsets(stroke), [0, stroke + foot] as const];
  return (
    <View style={lift}>
      {copies.map(([x, y]) => (
        <Text
          key={`${x},${y}`}
          {...HIDDEN}
          selectable={false}
          style={[text, styles.copy, { color: outline, transform: [{ translateX: x }, { translateY: y }] }]}
        >
          {glyph}
        </Text>
      ))}
      <Text selectable={false} style={[text, { color: fill }]}>
        {glyph}
      </Text>
    </View>
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Memoised: a board re-renders on every drag step, but most cells do not change. */
export const BlockTile = memo(BlockTileView);
BlockTile.displayName = 'BlockTile';

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  clip: { overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, top: 0 },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  round: { position: 'absolute', borderRadius: 999 },
  copy: { position: 'absolute', left: 0, right: 0, top: 0 },
  dim: { opacity: 0.55 },
  empty: {
    backgroundColor: palette.well,
    borderWidth: 1,
    borderTopColor: withAlpha(palette.frameDeep, 0.4),
    borderLeftColor: withAlpha(palette.frameDeep, 0.28),
    borderRightColor: withAlpha(palette.white, 0.7),
    borderBottomColor: withAlpha(palette.white, 0.95),
  },
  emptyShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: withAlpha(palette.frameDeep, 0.12),
  },
});
