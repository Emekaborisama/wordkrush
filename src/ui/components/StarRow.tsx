import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import { STAR_COUNT, starLabel, starScale, staggerDelay } from '../motion';
import { starPath } from '../shapes';
import { motion, palette, reward, shade } from '../theme';
import { useReduceMotion } from '../useReduceMotion';
import { useSvgId } from './Gradient';

export type StarSurface = 'coral' | 'cream' | 'sky';

const EMPTY: Record<StarSurface, { fill: string; edge: string }> = {
  coral: { fill: reward.starOff, edge: shade(reward.starOff, 0.3) },
  cream: { fill: reward.starOffLight, edge: shade(reward.starOffLight, 0.25) },
  sky: { fill: '#2B78C2', edge: '#1B5592' },
};

/**
 * The kit's chubby gold star: rounded tips, light-to-orange gradient, dark
 * amber outline, a pale inner bevel and a white glint. Unearned stars are a
 * darker silhouette of whatever they sit on, as in the kit's "LEVEL 2" popup.
 */
export function KitStar({
  size,
  filled,
  surface = 'coral',
}: {
  size: number;
  filled: boolean;
  surface?: StarSurface;
}) {
  const id = useSvgId('star');
  const empty = EMPTY[surface];
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor="#FFF27A" />
          <Stop offset={0.5} stopColor={palette.gold} />
          <Stop offset={1} stopColor={palette.goldDeep} />
        </LinearGradient>
      </Defs>
      {filled ? (
        <>
          <Path d={starPath(32, 35, 29)} fill={palette.goldEdge} />
          <Path d={starPath(32, 33, 28)} fill={`url(#${id})`} stroke={reward.outline} strokeWidth={3} strokeLinejoin="round" />
          <Path d={starPath(32, 33, 17)} fill="rgba(255,255,255,0.28)" />
          <Ellipse cx={23} cy={20} rx={5} ry={3} fill="rgba(255,255,255,0.9)" transform="rotate(-35 23 20)" />
        </>
      ) : (
        <>
          <Path d={starPath(32, 33, 28)} fill={empty.fill} stroke={empty.edge} strokeWidth={3} strokeLinejoin="round" />
          <Path d={starPath(32, 37, 20)} fill="rgba(0,0,0,0.12)" />
        </>
      )}
    </Svg>
  );
}

export type StarRowProps = {
  /** How many of the three stars are earned. */
  earned: 0 | 1 | 2 | 3;
  /** When false, stars show their end state with no pop. */
  animate?: boolean;
  /** Fired as each earned star pops, so the screen can play a sound. */
  onStar?: (index: number) => void;
  accessibilityLabel?: string;
  /** Side of the outer stars; the centre one is larger. */
  size?: number;
  /** What the row sits on, which decides the unearned colour. */
  surface?: StarSurface;
};

/**
 * Three stars, centre larger and raised. Earned stars pop in with a stagger;
 * reduce-motion shows the end state.
 */
export function StarRow({
  earned,
  animate = true,
  onStar,
  accessibilityLabel,
  size = 44,
  surface = 'coral',
}: StarRowProps) {
  const reduceMotion = useReduceMotion();
  const onStarRef = useRef(onStar);
  onStarRef.current = onStar;

  useEffect(() => {
    if (!animate || earned === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < earned; i += 1) {
      timers.push(
        setTimeout(() => onStarRef.current?.(i), reduceMotion ? 0 : staggerDelay(i, motion.staggerMs)),
      );
    }
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [animate, earned, reduceMotion]);

  return (
    <View accessibilityRole="image" accessibilityLabel={accessibilityLabel ?? starLabel(earned)} style={styles.row}>
      {Array.from({ length: STAR_COUNT }, (_, index) => (
        <PopStar
          key={index}
          index={index}
          size={Math.round(size * starScale(index))}
          filled={index < earned}
          surface={surface}
          animate={animate && !reduceMotion && index < earned}
        />
      ))}
    </View>
  );
}

function PopStar({
  index,
  size,
  filled,
  surface,
  animate,
}: {
  index: number;
  size: number;
  filled: boolean;
  surface: StarSurface;
  animate: boolean;
}) {
  const scale = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const delay = staggerDelay(index, motion.staggerMs);

  useEffect(() => {
    if (!animate) {
      scale.setValue(1);
      return;
    }
    scale.setValue(0);
    const anim = Animated.timing(scale, {
      toValue: 1,
      duration: motion.popMs,
      delay,
      easing: Easing.out(Easing.back(2)),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [animate, delay, scale]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[index === 1 && styles.centre, { transform: [{ scale }, { rotate: index === 0 ? '-8deg' : index === 2 ? '8deg' : '0deg' }] }]}
    >
      <KitStar size={size} filled={filled} surface={surface} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
  centre: { marginBottom: 10 },
});
