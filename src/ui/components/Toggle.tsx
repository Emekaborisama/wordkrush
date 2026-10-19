import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { font, motion, palette, tone } from '../theme';
import { useReduceMotion } from '../useReduceMotion';
import { Gradient } from './Gradient';
import { PressableScale } from './PressableScale';

const TRACK_W = 96;
const TRACK_H = 36;
const KNOB = 36;

/**
 * The kit's Music / SFX switch: a pale track reading ON or OFF, with a
 * square knob that is red (and carries the "off" icon) on the left, or green
 * (and carries the "on" icon) on the right.
 */
export function Toggle({
  value,
  onChange,
  accessibilityLabel,
  onIcon,
  offIcon,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel: string;
  onIcon?: ReactNode;
  offIcon?: ReactNode;
}) {
  const reduceMotion = useReduceMotion();
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      x.setValue(value ? 1 : 0);
      return;
    }
    Animated.timing(x, {
      toValue: value ? 1 : 0,
      duration: motion.standardMs,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
  }, [value, reduceMotion, x]);

  const knobTone = value ? tone.green : tone.red;
  return (
    <PressableScale
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      hitSlop={8}
      style={styles.track}
    >
      <Text style={[styles.word, value ? styles.wordLeft : styles.wordRight]}>{value ? 'ON' : 'OFF'}</Text>
      <Animated.View
        style={[
          styles.knob,
          {
            borderColor: knobTone.outline,
            transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-2, TRACK_W - KNOB - 2] }) }],
          },
        ]}
      >
        <View style={styles.knobClip}>
          <Gradient colors={[knobTone.top, knobTone.bottom]} />
        </View>
        <View style={styles.shine} />
        {value ? onIcon : offIcon}
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H - 4,
    borderRadius: 10,
    backgroundColor: '#E9DFD6',
    borderWidth: 2,
    borderColor: '#BDA796',
    justifyContent: 'center',
  },
  word: { position: 'absolute', fontFamily: font.black, fontSize: 14, lineHeight: 17, color: '#8F7F72' },
  wordLeft: { left: 12 },
  wordRight: { right: 12 },
  knob: {
    position: 'absolute',
    top: -4,
    width: KNOB,
    height: KNOB,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: palette.white,
  },
  knobClip: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  shine: {
    position: 'absolute',
    top: 2,
    left: 4,
    right: 4,
    height: '40%',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});
