import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { font, motion, palette } from '../theme';
import { useReduceMotion } from '../useReduceMotion';
import { DanfoBus } from './DanfoBus';
import { danfo } from './danfoTheme';

const BUS_W = 64;

/**
 * I Sabi Lagos' level progress: a strip of road with the danfo driving from
 * where you boarded to the next stop. Each right answer moves it forward; at
 * the target it pulls in under the stop sign.
 */
export function RoadProgress({
  streak,
  target,
  stop,
}: {
  streak: number;
  target: number;
  /** The next stop's name, on the sign at the far end. */
  stop: string;
}) {
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const fraction = target > 0 ? Math.min(1, streak / target) : 0;
  const arrived = fraction >= 1;

  useEffect(() => {
    const travel = Math.max(0, width - BUS_W - 56);
    const to = travel * fraction;
    if (reduceMotion) {
      x.setValue(to);
      return;
    }
    Animated.timing(x, {
      toValue: to,
      duration: motion.standardMs * 2,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fraction, width, reduceMotion, x]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  return (
    <View
      style={styles.wrap}
      onLayout={onLayout}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={arrived ? `Arrived at ${stop}` : `${streak} of ${target} to ${stop}`}
    >
      <View style={styles.road}>
        <View style={styles.lane}>
          {Array.from({ length: 14 }, (_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>
      </View>
      <View style={styles.post} pointerEvents="none">
        <View style={[styles.sign, arrived && styles.signArrived]}>
          <Text style={styles.signText} numberOfLines={1}>
            {stop.toUpperCase()}
          </Text>
        </View>
        <View style={styles.pole} />
      </View>
      <Animated.View style={[styles.bus, { transform: [{ translateX: x }] }]} pointerEvents="none">
        <DanfoBus width={BUS_W} driving={!arrived && streak > 0} destination={stop} />
      </Animated.View>
      <Text style={styles.count}>{`${Math.min(streak, target)}/${target}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 58, justifyContent: 'flex-end' },
  road: {
    height: 22,
    borderRadius: 11,
    backgroundColor: danfo.road,
    borderWidth: 2,
    borderColor: danfo.roadEdge,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lane: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 6 },
  dash: { width: 12, height: 3, borderRadius: 2, backgroundColor: danfo.lane, opacity: 0.85 },
  bus: { position: 'absolute', left: 4, bottom: 4 },
  post: { position: 'absolute', right: 4, bottom: 18, alignItems: 'center' },
  sign: {
    maxWidth: 96,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: palette.white,
    backgroundColor: danfo.sign,
  },
  signArrived: { backgroundColor: danfo.yellow, borderColor: danfo.black },
  signText: { fontFamily: font.black, fontSize: 9, lineHeight: 12, color: palette.white },
  pole: { width: 3, height: 14, backgroundColor: palette.white },
  count: {
    position: 'absolute',
    left: 8,
    top: 0,
    fontFamily: font.black,
    fontSize: 11,
    color: palette.white,
    textShadowColor: palette.navyDeep,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
