import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { clampParticleCount } from './motion';
import { theme } from './theme';
import { useReduceMotion } from './useReduceMotion';

const DEFAULT_COUNT = 14;
const DURATION_MS = 780;
const FALL_MS = 1100;

export type SparkleShape = 'dot' | 'rect';

export type SparkleProps = {
  active: boolean;
  color?: string;
  /** When set, particles cycle these colours. `color` is the fallback. */
  colors?: readonly string[];
  /** Capped at 24. Default 14, which is what existing callers already see. */
  count?: number;
  shape?: SparkleShape;
  /** Burst outward, then drift down. Confetti sets this. */
  fall?: boolean;
};

/**
 * A one-shot particle burst, fired when the count-up lands on its final number.
 *
 * Built on React Native's `Animated` rather than a particle library: it is the
 * one animation API that ships with RN and is mapped by react-native-web, so
 * the same code runs on iOS and in the browser with no extra dependency.
 *
 * Particle geometry is randomised ONCE per mount (useMemo) rather than per
 * frame — recomputing angles during the animation would make the burst jitter
 * instead of fly outward.
 */
export function Sparkle({
  active,
  color = theme.accent,
  colors,
  count = DEFAULT_COUNT,
  shape = 'dot',
  fall = false,
}: SparkleProps) {
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const total = clampParticleCount(count);
  const swatches = colors && colors.length > 0 ? colors : [color];
  const swatchKey = swatches.join('|');

  const particles = useMemo(
    () =>
      Array.from({ length: total }, (_, i) => {
        const base = (i / Math.max(1, total)) * Math.PI * 2;
        const angle = base + (Math.random() - 0.5) * 0.5;
        const list = swatchKey.split('|');
        return {
          angle,
          distance: 46 + Math.random() * 46,
          size: 4 + Math.random() * 5,
          delay: Math.random() * 90,
          spin: (Math.random() - 0.5) * 80,
          color: list[i % list.length] ?? color,
        };
      }),
    [total, swatchKey, color],
  );

  useEffect(() => {
    if (!active || reduceMotion) {
      progress.setValue(0);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: fall ? FALL_MS : DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [active, fall, progress, reduceMotion]);

  if (!active || reduceMotion) return null;

  return (
    // pointerEvents none: this sits over the card and must never eat a tap.
    <View style={styles.root} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no">
      {particles.map((p, i) => {
        const burst = progress.interpolate(
          fall
            ? { inputRange: [0, 0.42, 1], outputRange: [0, 1, 1] }
            : { inputRange: [0, 1], outputRange: [0, 1] },
        );
        const drop = progress.interpolate({
          inputRange: [0, 0.35, 1],
          outputRange: [0, 0, fall ? 90 : 0],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                width: shape === 'rect' ? p.size * 0.7 : p.size,
                height: shape === 'rect' ? p.size * 1.35 : p.size,
                borderRadius: shape === 'rect' ? 2 : p.size / 2,
                backgroundColor: p.color,
                opacity: progress.interpolate({
                  inputRange: [0, 0.12, 0.6, 1],
                  outputRange: [0, 1, 0.9, 0],
                }),
                transform: [
                  {
                    translateX: burst.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.cos(p.angle) * p.distance],
                    }),
                  },
                  {
                    translateY: Animated.add(
                      burst.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, Math.sin(p.angle) * p.distance],
                      }),
                      drop,
                    ),
                  },
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 0.25, 1],
                      outputRange: [0.2, 1.15, 0.35],
                    }),
                  },
                  { rotate: `${p.spin}deg` },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: { position: 'absolute' },
});
