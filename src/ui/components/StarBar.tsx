import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { starLabel } from '../motion';
import { motion, palette, radius, reward, theme } from '../theme';
import { useReduceMotion } from '../useReduceMotion';

export type StarBarProps = {
  /** 0–1 progress along the track. */
  progress: number;
  /** Where each of the three markers sits, 0–1. */
  thresholds?: readonly [number, number, number];
  onStar?: (index: number) => void;
  animate?: boolean;
};

const DEFAULT_THRESHOLDS: readonly [number, number, number] = [1 / 3, 2 / 3, 1];

/**
 * A track with three star markers. A marker pops once progress crosses it.
 */
export function StarBar({
  progress,
  thresholds = DEFAULT_THRESHOLDS,
  onStar,
  animate = true,
}: StarBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const earned = thresholds.filter((t) => clamped + 1e-6 >= t).length as 0 | 1 | 2 | 3;
  return (
    <View accessibilityRole="image" accessibilityLabel={starLabel(earned)} style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
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
  const scale = useRef(new Animated.Value(filled && animate && !reduceMotion ? 0 : 1)).current;
  const onStarRef = useRef(onStar);
  onStarRef.current = onStar;
  const popped = useRef(false);

  useEffect(() => {
    if (!filled) {
      scale.setValue(1);
      popped.current = false;
      return;
    }
    if (popped.current) return;
    popped.current = true;
    if (!animate || reduceMotion) {
      scale.setValue(1);
      onStarRef.current?.(index);
      return;
    }
    const timer = setTimeout(() => onStarRef.current?.(index), index * motion.staggerMs);
    const anim = Animated.timing(scale, {
      toValue: 1,
      duration: motion.popMs,
      delay: index * motion.staggerMs,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    });
    anim.start();
    return () => {
      clearTimeout(timer);
      anim.stop();
    };
  }, [animate, filled, index, reduceMotion, scale]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no"
      pointerEvents="none"
      style={[styles.marker, { left: `${threshold * 100}%`, transform: [{ translateX: -11 }, { scale }] }]}
    >
      <Text style={[styles.star, { color: filled ? reward.gold : reward.starOff }]}>★</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 28, justifyContent: 'center' },
  track: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: theme.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: palette.star, borderRadius: radius.pill },
  marker: { position: 'absolute', top: 0, width: 22, alignItems: 'center' },
  star: { fontSize: 18, lineHeight: 22, textAlign: 'center' },
});
