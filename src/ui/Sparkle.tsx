import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { theme } from './theme';

const PARTICLE_COUNT = 14;
const DURATION_MS = 780;

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
export function Sparkle({ active, color = theme.accent }: { active: boolean; color?: string }) {
  const progress = useRef(new Animated.Value(0)).current;

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        // Even spread around the circle, then jittered so it reads organic
        // rather than like clock hands.
        const base = (i / PARTICLE_COUNT) * Math.PI * 2;
        const angle = base + (Math.random() - 0.5) * 0.5;
        return {
          angle,
          distance: 46 + Math.random() * 46,
          size: 4 + Math.random() * 5,
          delay: Math.random() * 90,
        };
      }),
    [],
  );

  useEffect(() => {
    if (!active) {
      progress.setValue(0);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [active, progress]);

  if (!active) return null;

  return (
    // pointerEvents none: this sits over the card and must never eat a tap.
    <View style={styles.root} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: color,
              opacity: progress.interpolate({
                inputRange: [0, 0.12, 0.6, 1],
                outputRange: [0, 1, 0.9, 0],
              }),
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.cos(p.angle) * p.distance],
                  }),
                },
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.sin(p.angle) * p.distance],
                  }),
                },
                {
                  scale: progress.interpolate({
                    inputRange: [0, 0.25, 1],
                    outputRange: [0.2, 1.15, 0.35],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
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
