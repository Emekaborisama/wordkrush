import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import {
  bannerStars,
  exoBlackWidthEm,
  exoLineHeight,
  fitFontSize,
  sparklePath,
  streakWedges,
} from '../blockMath';
import { starPath } from '../shapes';
import { motion, palette, tone } from '../theme';
import { useReduceMotion } from '../useReduceMotion';
import { GoldText } from './BlockLogo';
import { useSvgId } from './Gradient';

const HIDDEN = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/** Block King's score gold: pale lemon top, deep gold foot. */
const BURST_FACE = ['#FFF9B8', '#FFEB63', '#FFD93D', '#FFC22B'] as const;
const BURST_OUTLINE = '#9A4600';
/** White-hot top fading to gold, for the celebration word. */
const BANNER_FACE = ['#FFFFFF', '#FFF6BF', '#FFE34F', '#FFC21F'] as const;

/** Keeps the latest callback without restarting an animation when it changes identity. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

export type ScoreBurstProps = {
  /** e.g. "+100". */
  text: string;
  /** Combo totals ("+400"): bigger, with a gold glow and a light flare. */
  big?: boolean;
  /** Called once the burst has faded out (also under reduce-motion). */
  onDone?: () => void;
  /** Position the burst's CENTRE: e.g. `{ position: 'absolute', left: x, top: y }`. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Block King's "+100": golden outlined number that pops in past full size,
 * settles, drifts up about 40px and fades over `motion.burstMs`. It draws
 * centred on whatever point `style` places it at, so callers never need its
 * measured size. Reduce-motion shows it still, then fades.
 */
export function ScoreBurst({ text, big = false, onDone, style }: ScoreBurstProps) {
  const reduceMotion = useReduceMotion();
  const pop = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const done = useLatest(onDone);

  const size = big ? 46 : 30;
  const textW = exoBlackWidthEm(text) * size;
  const stageW = Math.ceil(textW * (big ? 2.8 : 1.4) + 48);
  const stageH = Math.ceil(exoLineHeight(size) * (big ? 2.6 : 1.6));

  useEffect(() => {
    let called = false;
    pop.setValue(reduceMotion ? 1 : 0);
    drift.setValue(0);
    const anim = reduceMotion
      ? Animated.timing(drift, {
          toValue: 1,
          duration: motion.burstMs,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      : Animated.parallel([
          Animated.timing(pop, {
            toValue: 1,
            duration: motion.popMs + 80,
            easing: Easing.out(Easing.back(3)),
            useNativeDriver: true,
          }),
          Animated.timing(drift, {
            toValue: 1,
            duration: motion.burstMs,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]);
    anim.start(({ finished }) => {
      if (finished && !called) {
        called = true;
        done.current?.();
      }
    });
    return () => anim.stop();
  }, [reduceMotion, text, big, pop, drift, done]);

  const opacity = Animated.multiply(
    pop.interpolate({ inputRange: [0, 0.2], outputRange: [0, 1], extrapolate: 'clamp' }),
    drift.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0], extrapolate: 'clamp' }),
  );
  const rise = reduceMotion ? 0 : -40;

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={text} pointerEvents="none" style={style}>
      <Animated.View
        {...HIDDEN}
        style={[
          styles.stage,
          {
            width: stageW,
            height: stageH,
            marginLeft: -stageW / 2,
            marginTop: -stageH / 2,
            opacity,
            transform: [
              { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, rise] }) },
              { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
            ],
          },
        ]}
      >
        {big ? <BurstGlow width={stageW} height={stageH} textW={textW} size={size} /> : null}
        <GoldText text={text} size={size} colors={BURST_FACE} outline={BURST_OUTLINE} bleed />
      </Animated.View>
    </View>
  );
}

/** Soft gold bloom plus a thin horizontal and vertical light flare, as behind Block King's "+400". */
function BurstGlow({ width, height, textW, size }: { width: number; height: number; textW: number; size: number }) {
  const bloom = useSvgId('bloom');
  const flare = useSvgId('flare');
  const cx = width / 2;
  const cy = height / 2;
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={bloom} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFE680" stopOpacity={0.85} />
          <Stop offset="0.45" stopColor="#FFC531" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#FFB31F" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={flare} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={palette.white} stopOpacity={1} />
          <Stop offset="0.35" stopColor="#FFF3A6" stopOpacity={0.8} />
          <Stop offset="1" stopColor="#FFC531" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={cx} cy={cy} rx={textW * 0.95 + size * 0.4} ry={size * 1.05} fill={`url(#${bloom})`} />
      <Ellipse cx={cx} cy={cy} rx={Math.min(width / 2, textW * 1.4)} ry={Math.max(3, size * 0.12)} fill={`url(#${flare})`} />
      <Ellipse cx={cx} cy={cy} rx={Math.max(2, size * 0.08)} ry={Math.min(height / 2, size * 1.1)} fill={`url(#${flare})`} opacity={0.7} />
    </Svg>
  );
}

export type ComboBannerProps = {
  /** "GREAT!", "AMAZING!", "KRUSH!" … */
  text: string;
  /** Called once the banner has faded out (also under reduce-motion). */
  onDone?: () => void;
  /** Font size. By default it fits the box it covers, up to 58px. */
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const BANNER = { enterMs: 400, streakMs: 950, sparkleMs: 760, holdMs: 650, exitMs: 300, stillMs: 1100 } as const;
const STAR_COUNT = 8;

/**
 * The kit's "BLOCK BLAST!" moment: a big white-to-gold word with a dark
 * keyline pops over the board, light streaks burst behind it, little stars
 * and twinkles pop round it, then it all fades. Fills its parent (put it last
 * inside the board) and never takes a touch. Reduce-motion shows it still,
 * then fades.
 */
export function ComboBanner({ text, onDone, size, style }: ComboBannerProps) {
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const enter = useRef(new Animated.Value(0)).current;
  const streak = useRef(new Animated.Value(0)).current;
  const sparkle = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const done = useLatest(onDone);

  const fontSize = size ?? (width > 0 ? fitFontSize(text, width * 0.88, 58, 24, 14) : 44);
  const textW = exoBlackWidthEm(text) * fontSize;
  const stars = useMemo(() => bannerStars(textW * 0.58 + 16, fontSize * 0.95, STAR_COUNT), [textW, fontSize]);
  const burst = Math.round(Math.max(textW * 1.5, 260));

  useEffect(() => {
    let called = false;
    exit.setValue(0);
    let anim: Animated.CompositeAnimation;
    if (reduceMotion) {
      enter.setValue(1);
      streak.setValue(0.45);
      sparkle.setValue(1);
      anim = Animated.sequence([
        Animated.delay(BANNER.stillMs),
        Animated.timing(exit, { toValue: 1, duration: BANNER.exitMs, easing: Easing.linear, useNativeDriver: true }),
      ]);
    } else {
      enter.setValue(0);
      streak.setValue(0);
      sparkle.setValue(0);
      anim = Animated.sequence([
        Animated.parallel([
          Animated.timing(enter, {
            toValue: 1,
            duration: BANNER.enterMs,
            easing: Easing.out(Easing.back(2.4)),
            useNativeDriver: true,
          }),
          Animated.timing(streak, {
            toValue: 1,
            duration: BANNER.streakMs,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(sparkle, {
            toValue: 1,
            duration: BANNER.sparkleMs,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(BANNER.holdMs - (BANNER.streakMs - BANNER.enterMs)),
        Animated.timing(exit, {
          toValue: 1,
          duration: BANNER.exitMs,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]);
    }
    anim.start(({ finished }) => {
      if (finished && !called) {
        called = true;
        done.current?.();
      }
    });
    return () => anim.stop();
  }, [reduceMotion, text, enter, streak, sparkle, exit, done]);

  const onLayout = (event: LayoutChangeEvent) => {
    const w = Math.round(event.nativeEvent.layout.width);
    setWidth((prev) => (prev === w ? prev : w));
  };

  const fadeOut = exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const wordScale = Animated.multiply(
    enter.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    exit.interpolate({ inputRange: [0, 1], outputRange: [1, reduceMotion ? 1 : 1.12] }),
  );

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      pointerEvents="none"
      onLayout={onLayout}
      style={[StyleSheet.absoluteFill, styles.center, style]}
    >
      <Animated.View {...HIDDEN} style={[styles.center, { opacity: fadeOut }]}>
        <Animated.View
          style={{
            position: 'absolute',
            width: burst,
            height: burst,
            opacity: streak.interpolate({
              inputRange: [0, 0.12, 0.6, 1],
              outputRange: [0, 1, 0.75, 0.35],
              extrapolate: 'clamp',
            }),
            transform: [
              { scale: streak.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.12] }) },
              { rotate: streak.interpolate({ inputRange: [0, 1], outputRange: ['0deg', reduceMotion ? '0deg' : '12deg'] }) },
            ],
          }}
        >
          <Streaks size={burst} />
        </Animated.View>
        {stars.map((star, i) => {
          const start = Math.min(0.7, star.delay / BANNER.sparkleMs);
          const px = Math.round((i % 2 === 0 ? 22 : 16) * star.size + 6);
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                width: px,
                height: px,
                left: -px / 2,
                top: -px / 2,
                transform: [
                  { translateX: star.x },
                  { translateY: star.y },
                  { rotate: `${star.rotate}deg` },
                  {
                    scale: sparkle.interpolate({
                      inputRange: [start, start + 0.18, start + 0.3, 1],
                      outputRange: [0, 1.3, 1, 1],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              }}
            >
              {i % 2 === 0 ? <KitStar size={px} /> : <Twinkle size={px} />}
            </Animated.View>
          );
        })}
        <Animated.View
          style={{
            opacity: enter.interpolate({ inputRange: [0, 0.25], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [{ scale: wordScale }],
          }}
        >
          <GoldText text={text} size={fontSize} colors={BANNER_FACE} bleed />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function Streaks({ size }: { size: number }) {
  const fade = useSvgId('streak');
  const r = size / 2;
  const d = useMemo(() => streakWedges(r, 18).join(' '), [r]);
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={fade} cx={r} cy={r} r={r} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={palette.white} stopOpacity={0.95} />
          <Stop offset="0.4" stopColor="#FFF7C8" stopOpacity={0.55} />
          <Stop offset="1" stopColor={palette.white} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Path d={d} fill={`url(#${fade})`} />
    </Svg>
  );
}

/** The kit's chubby gold star: light-to-deep gold, dark keyline, white glint. */
function KitStar({ size }: { size: number }) {
  const fill = useSvgId('star');
  const c = size / 2;
  const outer = size * 0.45;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={tone.gold.top} />
          <Stop offset="1" stopColor={tone.gold.bottom} />
        </LinearGradient>
      </Defs>
      <Path
        d={starPath(c, c + size * 0.03, outer)}
        fill={`url(#${fill})`}
        stroke={tone.gold.outline}
        strokeWidth={Math.max(1, size * 0.07)}
        strokeLinejoin="round"
      />
      <Ellipse
        cx={c - outer * 0.28}
        cy={c - outer * 0.12}
        rx={outer * 0.16}
        ry={outer * 0.09}
        fill={palette.white}
        fillOpacity={0.85}
        transform={`rotate(-35 ${c - outer * 0.28} ${c - outer * 0.12})`}
      />
    </Svg>
  );
}

function Twinkle({ size }: { size: number }) {
  const c = size / 2;
  return (
    <Svg width={size} height={size}>
      <Path d={sparklePath(c, c, size * 0.48, 0.16)} fill={palette.white} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  stage: { position: 'absolute', left: '50%', top: '50%', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
