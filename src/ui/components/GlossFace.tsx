import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { gloss, motion, rim, shadow, withAlpha, type GlossTone } from '../theme';
import { useReduceMotion } from '../useReduceMotion';
import { Gradient } from './Gradient';

export type GlossFaceProps = {
  tone: GlossTone;
  pressed?: boolean;
  /** Lip height: the face sits this far above its base and sinks by it on press. */
  lip: number;
  radius: number;
  /** Dark ring around face and lip. */
  outline?: number;
  /** White shine band across the top of the face. */
  shine?: boolean;
  /** Drop shadow under the base. Off for controls that sit inside a panel. */
  raised?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Size and padding of the face. */
  faceStyle?: StyleProp<ViewStyle>;
};

/**
 * The kit's glossy button body: a gradient face (light top, saturated foot)
 * with a shine band and a gloss dot, sitting on a darker lip, both ringed in
 * the tone's outline. Pressing sinks the face onto the lip — transform only,
 * so layout never moves — and the space it leaves above shows whatever is
 * behind the button, which is what makes it read as pushed in.
 *
 * The shadow lives on the base, which has a radius; a shadow on a transparent
 * wrapper draws a square box on web.
 */
export function GlossFace({
  tone,
  pressed = false,
  lip,
  radius,
  outline = 2,
  shine = true,
  raised = true,
  children,
  style,
  faceStyle,
}: GlossFaceProps) {
  const reduceMotion = useReduceMotion();
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const to = pressed ? lip : 0;
    shift.stopAnimation();
    if (reduceMotion || lip === 0) {
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
  }, [pressed, lip, reduceMotion, shift]);

  const inner = Math.max(0, radius - outline);
  return (
    <View style={[styles.shell, style]}>
      <View
        pointerEvents="none"
        style={[
          styles.base,
          { top: lip, borderRadius: radius, backgroundColor: tone.outline, padding: outline },
          raised && shadow.card,
        ]}
      >
        <View style={[styles.fill, { borderRadius: inner, backgroundColor: tone.lip }]} />
      </View>
      <Animated.View
        style={{
          marginBottom: lip,
          borderRadius: radius,
          backgroundColor: tone.outline,
          padding: outline,
          transform: [{ translateY: shift }],
        }}
      >
        <View style={[styles.face, { borderRadius: inner, backgroundColor: tone.bottom }, faceStyle]}>
          <Gradient colors={[tone.top, tone.bottom]} locations={[0, 0.78]} />
          {shine ? (
            <>
              <View
                pointerEvents="none"
                style={[
                  styles.shine,
                  {
                    borderTopLeftRadius: Math.max(0, inner - 3),
                    borderTopRightRadius: Math.max(0, inner - 3),
                    borderBottomLeftRadius: inner,
                    borderBottomRightRadius: inner,
                  },
                ]}
              />
              <View pointerEvents="none" style={styles.rim} />
              <View pointerEvents="none" style={styles.dot} />
            </>
          ) : null}
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { position: 'relative' },
  base: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  fill: { flex: 1 },
  face: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  shine: {
    position: 'absolute',
    top: 3,
    left: 5,
    right: 5,
    height: `${gloss.height * 100}%`,
    backgroundColor: withAlpha('#FFFFFF', gloss.alpha),
  },
  rim: {
    position: 'absolute',
    top: 1,
    left: 10,
    right: 10,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: withAlpha('#FFFFFF', rim.alpha),
  },
  dot: {
    position: 'absolute',
    top: 5,
    left: 7,
    width: 7,
    height: 5,
    borderRadius: 4,
    backgroundColor: withAlpha('#FFFFFF', 0.85),
    transform: [{ rotate: '-24deg' }],
  },
});
