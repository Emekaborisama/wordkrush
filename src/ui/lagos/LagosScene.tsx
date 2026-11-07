import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { useReduceMotion } from '../useReduceMotion';
import { DanfoBus } from './DanfoBus';
import { danfo } from './danfoTheme';

const ROAD_H = 64;
const SKYLINE_H = 120;

/** Building outlines for the Lagos skyline, left to right: [x%, width, height]. */
const BUILDINGS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 34, 52], [7, 26, 80], [13, 40, 64], [22, 22, 104], [27, 36, 72], [36, 30, 92], [43, 46, 58],
  [53, 24, 112], [59, 38, 70], [68, 28, 96], [75, 44, 62], [85, 26, 86], [91, 40, 66],
];

/**
 * The bottom of the I Sabi Lagos screen: a Lagos skyline against the kit's
 * sky, the road in front of it, and a danfo that drives across now and then.
 * Pure backdrop — never takes a touch.
 */
export function LagosScene() {
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const drive = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion || width === 0) {
      drive.setValue(0.62);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drive, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(1600),
        Animated.timing(drive, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    drive.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, width, drive]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const busW = 132;

  return (
    <View style={styles.root} pointerEvents="none" onLayout={onLayout} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {width > 0 ? (
        <Svg width={width} height={SKYLINE_H + ROAD_H} style={styles.svg} aria-hidden>
          <G opacity={0.55}>
            {BUILDINGS.map(([xPct, w, h], i) => {
              const x = (xPct / 100) * width;
              const y = SKYLINE_H - h;
              return (
                <G key={i}>
                  <Rect x={x} y={y} width={w} height={h + 2} fill={i % 2 === 0 ? '#3C78BF' : '#326AAE'} />
                  {Array.from({ length: Math.floor(h / 14) }, (_, row) => (
                    <Rect key={row} x={x + 5} y={y + 6 + row * 14} width={w - 10} height={4} fill="rgba(255,255,255,0.35)" />
                  ))}
                </G>
              );
            })}
          </G>
          {/* Third Mainland Bridge, low across the lagoon. */}
          <Path d={`M0 ${SKYLINE_H - 14} L${width} ${SKYLINE_H - 22}`} stroke="#2B5E9E" strokeWidth={5} opacity={0.6} />
          <Rect x={0} y={SKYLINE_H} width={width} height={ROAD_H} fill={danfo.road} />
          <Rect x={0} y={SKYLINE_H} width={width} height={5} fill="#C9CED6" />
          {Array.from({ length: Math.ceil(width / 46) }, (_, i) => (
            <Rect key={i} x={i * 46 + 8} y={SKYLINE_H + ROAD_H / 2 - 2} width={24} height={4} rx={2} fill={danfo.yellow} />
          ))}
        </Svg>
      ) : null}
      <Animated.View
        style={[
          styles.bus,
          {
            transform: [
              { translateX: drive.interpolate({ inputRange: [0, 1], outputRange: [-busW - 10, width + 10] }) },
            ],
          },
        ]}
      >
        <DanfoBus width={busW} driving destination="ISABI LAGOS" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, bottom: 0, height: SKYLINE_H + ROAD_H },
  svg: { position: 'absolute', left: 0, bottom: 0 },
  bus: { position: 'absolute', left: 0, bottom: 14 },
});
