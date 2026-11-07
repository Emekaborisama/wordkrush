import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { starLabel } from '../motion';
import { font, motion, palette, withAlpha } from '../theme';
import { useReduceMotion } from '../useReduceMotion';
import { Gradient } from './Gradient';
import { KitStar } from './StarRow';

export type StarBarProps = {
  /** 0–1 progress along the track. */
  progress: number;
  /** Where each of the three star markers sits, 0–1. */
  thresholds?: readonly [number, number, number];
  onStar?: (index: number) => void;
  animate?: boolean;
  /** Text inside the track, e.g. "27%". */
  label?: string;
};

const DEFAULT_THRESHOLDS: readonly [number, number, number] = [1 / 3, 2 / 3, 1];
const STAR = 20;

/**
 * The kit's score bar: a dark sunken track with a gold fill and three stars
 * hanging under it that light up as the fill passes them.
 */
export function StarBar({
  progress,
  thresholds = DEFAULT_THRESHOLDS,
  onStar,
  animate = true,
  label,
}: StarBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const earned = thresholds.filter((t) => clamped + 1e-6 >= t).length as 0 | 1 | 2 | 3;
  return (
    <View accessibilityRole="image" accessibilityLabel={starLabel(earned)} style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped * 100}%` }]}>
          <Gradient colors={['#FFE85C', palette.gold, palette.goldDeep]} locations={[0, 0.5, 1]} />
          <View style={styles.shine} />
        </View>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
      {thresholds.map((threshold, index) => (
        <Marker
          key={index}
          index={index}
          threshold={threshold}
          filled={index < earned}
          animate={animate}
          onStar={onStar}
        />
      ))}
    </View>
  );
}

/** Same bar under its kit name. */
export const ProgressBar = StarBar;

function Marker({
  index,
  threshold,
  filled,
  animate,
  onStar,
}: {
  index: number;
  threshold: number;
  filled: boolean;
  animate: boolean;
  onStar?: (index: number) => void;
}) {
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const onStarRef = useRef(onStar);
  onStarRef.current = onStar;
  const popped = useRef(filled);

  useEffect(() => {
    if (!filled) {
      popped.current = false;
      scale.setValue(1);
      return;
    }
    if (popped.current) return;
    popped.current = true;
    onStarRef.current?.(index);
    if (!animate || reduceMotion) return;
    scale.setValue(0.3);
    const anim = Animated.timing(scale, {
      toValue: 1,
      duration: motion.popMs,
      easing: Easing.out(Easing.back(2.2)),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [animate, filled, index, reduceMotion, scale]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        styles.marker,
        // The last marker sits inside the track's end instead of past it.
        { left: `${Math.min(threshold, 0.96) * 100}%`, transform: [{ translateX: -STAR / 2 }, { scale }] },
      ]}
    >
      <KitStar size={STAR} filled={filled} surface="sky" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 14 + STAR - 4, justifyContent: 'flex-start' },
  track: {
    height: 14,
    borderRadius: 7,
    backgroundColor: palette.navyDeep,
    borderWidth: 2,
    borderColor: '#0E2A55',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 5, overflow: 'hidden' },
  shine: {
    position: 'absolute',
    top: 1,
    left: 3,
    right: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: withAlpha('#FFFFFF', 0.55),
  },
  label: {
    alignSelf: 'center',
    fontFamily: font.black,
    fontSize: 10,
    lineHeight: 12,
    color: palette.white,
    textShadowColor: palette.navyDeep,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  marker: { position: 'absolute', top: 8, width: STAR, alignItems: 'center' },
});
