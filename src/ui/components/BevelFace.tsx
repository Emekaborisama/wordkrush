import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { gloss, motion, rim, withAlpha } from '../theme';
import { useReduceMotion } from '../useReduceMotion';

export type BevelFaceProps = {
  pressed: boolean;
  /** Lip height. The face sits this many pixels above the base and moves down by it. */
  bevelPx: number;
  faceColor: string;
  bevelColor: string;
  radius: number;
  children: ReactNode;
  /** White top sheen. Off for ghost and fully transparent faces. */
  gloss?: boolean;
  style?: StyleProp<ViewStyle>;
  faceStyle?: StyleProp<ViewStyle>;
};

/**
 * Two-layer pressable face. The base is the darker lip. The face sits
 * `bevelPx` above it and translates down by that amount on press, on web and
 * native. Transform only, so the layout does not shift.
 */
export function BevelFace({
  pressed,
  bevelPx,
  faceColor,
  bevelColor,
  radius,
  children,
  gloss: showGloss = true,
  style,
  faceStyle,
}: BevelFaceProps) {
  const reduceMotion = useReduceMotion();
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const to = pressed ? bevelPx : 0;
    shift.stopAnimation();
    if (reduceMotion || bevelPx === 0) {
      shift.setValue(to);
      return;
    }
    if (pressed) {
      Animated.timing(shift, {
        toValue: to,
        duration: motion.pressMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.spring(shift, {
      toValue: 0,
      damping: motion.snappy.damping,
      stiffness: motion.snappy.stiffness,
      mass: motion.snappy.mass,
      useNativeDriver: true,
    }).start();
  }, [pressed, bevelPx, reduceMotion, shift]);

  return (
    <View style={[styles.shell, { borderRadius: radius }, style]}>
      <View
        pointerEvents="none"
        style={[styles.base, { backgroundColor: bevelColor, borderRadius: radius }]}
      />
      <Animated.View
        style={[
          styles.face,
          faceStyle,
          {
            backgroundColor: faceColor,
            borderRadius: radius,
            marginBottom: bevelPx,
            transform: [{ translateY: shift }],
          },
        ]}
      >
        {showGloss ? (
          <View
            pointerEvents="none"
            style={[styles.gloss, { height: `${gloss.height * 100}%`, borderRadius: radius }]}
          />
        ) : null}
        {showGloss ? <View pointerEvents="none" style={styles.rim} /> : null}
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { position: 'relative', overflow: 'hidden' },
  base: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  face: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: withAlpha('#FFFFFF', gloss.alpha),
  },
  rim: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: withAlpha('#FFFFFF', rim.alpha),
  },
});
