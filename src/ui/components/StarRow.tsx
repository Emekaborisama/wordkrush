import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { STAR_COUNT, STAR_OUTLINE_OFFSETS, starLabel, starScale, staggerDelay } from '../motion';
import { motion, reward } from '../theme';
import { useReduceMotion } from '../useReduceMotion';

export type StarRowProps = {
  /** How many of the three stars are earned. */
  earned: 0 | 1 | 2 | 3;
  /** When false, stars show their end state with no pop. */
  animate?: boolean;
  /** Fired as each earned star pops, so the screen can play a sound. */
  onStar?: (index: number) => void;
  accessibilityLabel?: string;
};

const SIDE = 36;

/**
 * Three stars, centre larger and raised. Earned stars are gold with an orange
 * outline. The pop is staggered; reduce-motion shows the end state.
 * The glyph is a system ★ — no fontFamily.
 */
export function StarRow({ earned, animate = true, onStar, accessibilityLabel }: StarRowProps) {
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
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? starLabel(earned)}
      style={styles.row}
    >
      {Array.from({ length: STAR_COUNT }, (_, index) => (
        <Star
          key={index}
          index={index}
          filled={index < earned}
          animate={animate && !reduceMotion && index < earned}
        />
      ))}
    </View>
  );
}

function Star({ index, filled, animate }: { index: number; filled: boolean; animate: boolean }) {
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
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [animate, delay, scale]);

  const size = SIDE * starScale(index);
  const color = filled ? reward.gold : reward.starOff;
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.star, index === 1 && styles.centre, { transform: [{ scale }] }]}
    >
      {filled
        ? STAR_OUTLINE_OFFSETS.map(([x, y]) => (
            <Text
              key={`${x},${y}`}
              style={[styles.glyph, styles.copy, { fontSize: size, color: reward.goldHot, transform: [{ translateX: x }, { translateY: y }] }]}
            >
              ★
            </Text>
          ))
        : null}
      <Text style={[styles.glyph, { fontSize: size, lineHeight: size + 4, color }]}>★</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6 },
  star: { alignItems: 'center', justifyContent: 'center' },
  centre: { marginBottom: 8 },
  glyph: { textAlign: 'center' },
  copy: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
});
