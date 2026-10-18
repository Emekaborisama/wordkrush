import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { RAY_COUNT, rayAngleDeg } from '../motion';
import { motion, palette, withAlpha } from '../theme';
import { useReduceMotion } from '../useReduceMotion';

export type RaysProps = {
  size?: number;
  color?: string;
};

/**
 * Twelve wedges in a slow spin. Static under reduce-motion. The triangles are
 * borders, not SVG, so web and native match. Never takes a tap.
 */
export function Rays({ size = 280, color = withAlpha(palette.star, 0.72) }: RaysProps) {
  const reduceMotion = useReduceMotion();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      spin.stopAnimation();
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: motion.rayPeriodMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const wedge = size * 0.04;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.root, { width: size, height: size, transform: [{ rotate }] }]}
    >
      {Array.from({ length: RAY_COUNT }, (_, index) => (
        <View
          key={index}
          style={[styles.spoke, { width: size, height: size, transform: [{ rotate: `${rayAngleDeg(index)}deg` }] }]}
        >
          <View
            style={{
              marginTop: size * 0.02,
              width: 0,
              height: 0,
              borderLeftWidth: wedge,
              borderRightWidth: wedge,
              borderTopWidth: size * 0.42,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: index % 2 === 0 ? color : withAlpha(palette.ribbon, 0.45),
            }}
          />
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  spoke: { position: 'absolute', alignItems: 'center' },
});
