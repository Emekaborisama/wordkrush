import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import {
  capLift,
  capTop,
  cubeShades,
  deepen,
  EXO_BLACK,
  exoLineHeight,
  extrusionSteps,
  letterPoses,
  logoCubePoses,
  logoMetrics,
} from '../blockMath';
import { strokeOffsets, type Point } from '../shapes';
import { cube, font, motion, palette, tint, withAlpha } from '../theme';
import { useReduceMotion } from '../useReduceMotion';

const HIDDEN = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/** "BLAST!"-style gold, top to bottom. */
export const GOLD_FACE = ['#FFF6A0', '#FFE54D', '#FFCF2E', '#FFB51F'] as const;
/** The extruded side: near the face, then the far edge. */
export const GOLD_EXTRUDE = ['#F59B0F', '#D0700A'] as const;
/** Dark orange-brown keyline around the whole silhouette. */
export const GOLD_OUTLINE = '#7C3F00';

export type GoldTextProps = {
  text: string;
  /** Font size in px. */
  size: number;
  /** Face colours, top to bottom. Two or more; gold by default. */
  colors?: readonly string[];
  /** Extruded side: [near the face, far edge]. */
  extrude?: readonly [string, string];
  /** Keyline colour. */
  outline?: string;
  /** Keyline width in px. ≈7.5% of the size by default. */
  strokeWidth?: number;
  /** How far the extruded side drops below the face, px. ≈10% by default; 0 is flat. */
  depth?: number;
  /** White sheen along the letters' top edges. */
  glint?: boolean;
  /**
   * Let the keyline and extrusion overflow the layout box instead of padding
   * it, so centring the component centres the letters themselves.
   */
  bleed?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Makes the word one accessible text element. Decorative otherwise. */
  accessibilityLabel?: string;
};

/**
 * Chunky extruded lettering, the kit's "BLAST!": a face graded light to deep
 * gold, an orange side dropping down-right, one dark keyline round the whole
 * silhouette and a white sheen on the top edges. Built from Text copies so it
 * renders the same on web and native with no text-stroke API; horizontal
 * clipped bands stand in for a gradient fill.
 */
export function GoldText({
  text,
  size,
  colors = GOLD_FACE,
  extrude = GOLD_EXTRUDE,
  outline = GOLD_OUTLINE,
  strokeWidth,
  depth,
  glint = true,
  bleed = false,
  style,
  accessibilityLabel,
}: GoldTextProps) {
  const w = strokeWidth ?? Math.max(1.5, Math.round(size * 0.06 * 2) / 2);
  const d = depth ?? Math.max(1, Math.round(size * 0.12));
  const dx = Math.round(d * 0.35 * 10) / 10;

  const layers = useMemo(() => {
    const ring = strokeOffsets(w);
    const anchors: Point[] = d > 0 ? [[0, 0], [dx / 2, d / 2], [dx, d]] : [[0, 0]];
    const seen = new Set<string>();
    const outlineCopies: Point[] = [];
    for (const [ax, ay] of anchors) {
      for (const [x, y] of ring) {
        const p: Point = [Math.round((ax + x) * 10) / 10, Math.round((ay + y) * 10) / 10];
        const key = `${p[0]},${p[1]}`;
        if (!seen.has(key)) {
          seen.add(key);
          outlineCopies.push(p);
        }
      }
    }
    const steps = d > 0 ? extrusionSteps(dx, d, Math.max(2, Math.ceil(d / 1.5))) : [];
    return { outlineCopies, steps };
  }, [w, d, dx]);

  const line = exoLineHeight(size);
  const top = capTop(size);
  const cap = size * EXO_BLACK.cap;
  const pad = {
    left: Math.ceil(w),
    right: Math.ceil(w + dx),
    top: Math.ceil(w),
    bottom: Math.ceil(w + d),
  };
  const base: TextStyle = { fontFamily: font.black, fontSize: size, lineHeight: line, includeFontPadding: false };
  const n = colors.length;
  const faceColor = colors[n - 1] ?? GOLD_FACE[3];
  const extrudeFar = extrude[1];
  const extrudeNear = extrude[0];

  const a11y = accessibilityLabel
    ? { accessible: true, accessibilityRole: 'text' as const, accessibilityLabel }
    : HIDDEN;

  return (
    <View
      {...a11y}
      pointerEvents="none"
      style={[
        { paddingLeft: pad.left, paddingRight: pad.right, paddingTop: pad.top, paddingBottom: pad.bottom },
        bleed && {
          marginLeft: -pad.left,
          marginRight: -pad.right,
          marginTop: -pad.top,
          marginBottom: -pad.bottom,
        },
        style,
      ]}
    >
      {/* Every layer is positioned against this box, which hugs the face text
          and centres itself if the parent stretches the root. */}
      <View style={styles.glyphBox}>
        {layers.outlineCopies.map(([x, y]) => (
          <Text
            key={`o${x},${y}`}
            {...HIDDEN}
            selectable={false}
            style={[base, styles.layer, { color: outline, transform: [{ translateX: x }, { translateY: y }] }]}
          >
            {text}
          </Text>
        ))}
        {layers.steps.map(([x, y], i) => (
          <Text
            key={`e${x},${y}`}
            {...HIDDEN}
            selectable={false}
            style={[
              base,
              styles.layer,
              {
                color: i === 0 ? extrudeFar : extrudeNear,
                transform: [{ translateX: x }, { translateY: y }],
              },
            ]}
          >
            {text}
          </Text>
        ))}
        <Text {...HIDDEN} selectable={false} style={[base, { color: faceColor }]}>
          {text}
        </Text>
        {colors
          .slice(0, -1)
          .map((color, j) => ({ color, j }))
          .reverse()
          .map(({ color, j }) => (
            <View key={`b${j}`} style={[styles.band, { height: top + (cap * (j + 1)) / n }]}>
              <Text {...HIDDEN} selectable={false} style={[base, styles.layer, { color }]}>
                {text}
              </Text>
            </View>
          ))}
        {glint ? (
          <View style={[styles.band, { top, height: Math.max(1.5, cap * 0.16) }]}>
            <Text
              {...HIDDEN}
              selectable={false}
              style={[base, styles.layer, { top: -top, color: withAlpha(palette.white, 0.45) }]}
            >
              {text}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

type LogoCubeProps = { size: number; color: string; letter: string; letterSize: number };

/**
 * One letter cube from the hero: a chunky rounded block seen a little from
 * above (lighter top face, deep lip), with the letter raised off its front in
 * a pale tint of the cube and a darker side, as in the kit's B-L-O-C-K.
 */
function LogoCube({ size, color, letter, letterSize }: LogoCubeProps) {
  const s = cubeShades(color);
  const r = size * 0.2;
  const edge = Math.max(1, Math.round(size * 0.03 * 2) / 2);
  const lip = Math.max(2, Math.round(size * 0.13));
  const faceH = size - lip - edge;
  const topFace = size * 0.13;
  const letterDepth = Math.max(1, Math.round(size * 0.055));
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: r, backgroundColor: s.lip, borderWidth: edge, borderColor: deepen(color, 0.62) },
        ]}
      />
      <View
        style={[
          styles.clip,
          {
            position: 'absolute',
            left: edge,
            right: edge,
            top: edge,
            height: faceH,
            borderRadius: r - edge,
            backgroundColor: s.face,
          },
        ]}
      >
        <View style={[styles.band, { left: 0, right: 0, top: 0, height: faceH * 0.55, backgroundColor: withAlpha(palette.white, 0.08) }]} />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: topFace,
            backgroundColor: tint(color, 0.3),
            borderBottomWidth: Math.max(1, size * 0.015),
            borderBottomColor: withAlpha(palette.white, 0.35),
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: topFace,
            right: 0,
            bottom: 0,
            width: size * 0.07,
            backgroundColor: withAlpha(deepen(color, 0.3), 0.25),
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * 0.07,
            right: size * 0.1,
            top: topFace + size * 0.05,
            bottom: size * 0.06,
            borderRadius: r * 0.7,
            borderWidth: Math.max(1, size * 0.018),
            borderColor: withAlpha(palette.white, 0.16),
          }}
        />
      </View>
      <View
        style={[
          styles.round,
          {
            left: size * 0.1,
            top: size * 0.05,
            width: Math.max(2, size * 0.07),
            height: Math.max(2, size * 0.07),
            backgroundColor: withAlpha(palette.white, 0.9),
          },
        ]}
      />
      <View style={[styles.center, { position: 'absolute', left: edge, right: edge, top: topFace * 0.6, bottom: lip }]}>
        <View style={{ transform: [{ translateY: capLift(letterSize) }] }}>
          <GoldText
            text={letter}
            size={letterSize}
            colors={[tint(color, 0.62), tint(color, 0.48)]}
            extrude={[deepen(color, 0.16), deepen(color, 0.3)]}
            outline={deepen(color, 0.5)}
            strokeWidth={Math.max(1, Math.round(size * 0.022 * 2) / 2)}
            depth={letterDepth}
            glint={false}
            bleed
          />
        </View>
      </View>
    </View>
  );
}

export type BlockLogoProps = {
  /** Cube size: 'hero' ≈ 58px (menus), 'compact' ≈ 22px (top bar), or px. */
  size?: 'hero' | 'compact' | number;
  /** 'stacked' puts KRUSH! under the cubes; 'row' beside them. Hero stacks, compact rows. */
  layout?: 'stacked' | 'row';
  /** Cubes drop in one by one, KRUSH! pops, then the cubes bob. Static under reduce-motion. */
  animate?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const WORD: ReadonlyArray<{ letter: string; color: string }> = [
  { letter: 'W', color: cube.red },
  { letter: 'O', color: cube.orange },
  { letter: 'R', color: cube.green },
  { letter: 'D', color: cube.blue },
];
const KRUSH = ['K', 'R', 'U', 'S', 'H', '!'] as const;

const SIZE_PX = { hero: 58, compact: 22 } as const;

/**
 * The in-app lockup in the kit's hero style: "WORD" as four glossy letter
 * cubes on a gentle arch, "KRUSH!" in chunky extruded gold beneath (or beside).
 */
export function BlockLogo({
  size = 'hero',
  layout,
  animate = false,
  accessibilityLabel = 'WordKrush',
  style,
}: BlockLogoProps) {
  const cubePx = typeof size === 'number' ? size : SIZE_PX[size];
  const mode = layout ?? (cubePx >= 36 ? 'stacked' : 'row');
  const m = logoMetrics(cubePx, mode);
  const poses = useMemo(() => {
    const raw = logoCubePoses(WORD.length, cubePx);
    // Beside the word, an arch would fight the baseline: keep the tilt, flatten it.
    return mode === 'row' ? raw.map((p) => ({ rotate: p.rotate * 0.6, drop: 0 })) : raw;
  }, [cubePx, mode]);
  const letters = useMemo(() => letterPoses(KRUSH.length, m.wordSize), [m.wordSize]);

  const reduceMotion = useReduceMotion();
  const drops = useRef(WORD.map(() => new Animated.Value(animate ? 0 : 1))).current;
  const pop = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const idle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate || reduceMotion) {
      drops.forEach((v) => v.setValue(1));
      pop.setValue(1);
      idle.setValue(0);
      return;
    }
    drops.forEach((v) => v.setValue(0));
    pop.setValue(0);
    idle.setValue(0);
    let bob: Animated.CompositeAnimation | null = null;
    const spring = (v: Animated.Value) =>
      Animated.spring(v, { toValue: 1, ...motion.celebratory, useNativeDriver: true });
    const intro = Animated.parallel([
      Animated.stagger(motion.staggerMs * 0.65, drops.map(spring)),
      Animated.sequence([Animated.delay(motion.staggerMs * 0.65 * WORD.length + 60), spring(pop)]),
    ]);
    intro.start(({ finished }) => {
      if (!finished) return;
      bob = Animated.loop(
        Animated.sequence([
          Animated.timing(idle, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(idle, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
      bob.start();
    });
    return () => {
      intro.stop();
      bob?.stop();
    };
  }, [animate, reduceMotion, drops, pop, idle]);

  const bobPx = Math.max(1, cubePx * 0.045);
  const row = mode === 'row';
  // The stretch is a transform, so layout never sees it: reserve its overflow.
  const grow = ((m.stretch - 1) * exoLineHeight(m.wordSize)) / 2;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[row ? styles.row : styles.stacked, style]}
    >
      <View {...HIDDEN} style={[styles.cubes, { paddingTop: row ? 0 : cubePx * 0.06 }]}>
        {WORD.map(({ letter, color }, i) => {
          const pose = poses[i]!;
          const v = drops[i]!;
          const spin = i % 2 === 0 ? -28 : 24;
          return (
            <Animated.View
              key={letter}
              style={{
                marginLeft: i === 0 ? 0 : -m.overlap,
                opacity: v.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
                transform: [
                  {
                    translateY: Animated.add(
                      v.interpolate({ inputRange: [0, 1], outputRange: [-cubePx * 2.4, pose.drop] }),
                      idle.interpolate({ inputRange: [0, 1], outputRange: i % 2 === 0 ? [0, -bobPx] : [-bobPx, 0] }),
                    ),
                  },
                  {
                    rotate: v.interpolate({
                      inputRange: [0, 1],
                      outputRange: [`${pose.rotate + spin}deg`, `${pose.rotate}deg`],
                    }),
                  },
                ],
              }}
            >
              <LogoCube size={cubePx} color={color} letter={letter} letterSize={m.cubeLetter} />
            </Animated.View>
          );
        })}
      </View>
      <Animated.View
        {...HIDDEN}
        style={[
          styles.word,
          row
            ? { marginLeft: cubePx * 0.22, marginVertical: grow }
            : { marginTop: -m.tuck, marginBottom: grow },
          {
            opacity: pop.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
            transform: [
              { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) },
              { scaleY: m.stretch },
            ],
          },
        ]}
      >
        {KRUSH.map((ch, i) => {
          const pose = letters[i]!;
          return (
            <View
              key={`${ch}${i}`}
              style={{
                marginLeft: i === 0 ? 0 : -m.wordSize * 0.012,
                transform: [{ translateY: pose.drop }, { rotate: `${pose.rotate}deg` }],
              }}
            >
              <GoldText text={ch} size={m.wordSize} strokeWidth={m.wordStroke} depth={m.wordDepth} bleed />
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glyphBox: { alignSelf: 'center' },
  layer: { position: 'absolute', left: 0, top: 0 },
  band: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  clip: { overflow: 'hidden' },
  round: { position: 'absolute', borderRadius: 999 },
  center: { alignItems: 'center', justifyContent: 'center' },
  stacked: { alignItems: 'center', alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  cubes: { flexDirection: 'row', alignItems: 'flex-start' },
  word: { flexDirection: 'row', alignItems: 'flex-end' },
});
