import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { FLUENT, type FluentName } from '../fluent';
import { trailPathD, trailWindow, type Stone } from '../levelTrail';
import { font, palette } from '../theme';
import { useReduceMotion } from '../useReduceMotion';
import { Gradient } from './Gradient';
import { LevelStone } from './LevelStone';
import { PressableScale } from './PressableScale';

const HEIGHT = 70;
const STONE = 34;
const CURRENT = 42;
const MID = 44;

/**
 * The level path in the play screen, after the Animal Heroes map: a strip of
 * meadow with the sandy trail, the stones around your level, and the game's
 * 3D animal standing on the one you are playing. `progress` (0–1) rings the
 * current stone, so a run's march toward three stars shows on the path
 * itself. Tap to open the full meadow map.
 */
export function LevelTrail({
  stones,
  current,
  animal,
  progress,
  onPress,
}: {
  stones: readonly Stone[];
  current: number;
  animal: FluentName;
  progress?: number;
  onPress?: () => void;
}) {
  const [width, setWidth] = useState(0);
  const reduceMotion = useReduceMotion();
  const hop = useRef(new Animated.Value(0)).current;
  const shown = trailWindow(stones, current);
  const total = stones.length;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hop, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(hop, { toValue: 0, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(900),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, hop]);

  const pad = 30;
  const step = shown.length > 1 ? (width - pad * 2) / (shown.length - 1) : 0;
  const points = shown.map((_, i) => ({ x: pad + i * step, y: MID + (i % 2 === 0 ? 4 : -4) }));
  const path = trailPathD(points);
  const ring = CURRENT / 2 + 5;
  const circumference = 2 * Math.PI * ring;
  const fill = Math.max(0, Math.min(1, progress ?? 0));

  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Level ${current} of ${total}. Open the level map`}
      style={styles.wrap}
    >
      <View style={styles.meadow} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {/* The grass clips to the rounded strip; the animal is free to stand above it. */}
        <View style={styles.clip}>
          <Gradient colors={['#A8E37E', '#6CC04A', '#4E9E35']} locations={[0, 0.55, 1]} />
        </View>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT} style={StyleSheet.absoluteFill}>
            <Path d={path} stroke="#C9963F" strokeWidth={22} fill="none" strokeLinecap="round" />
            <Path d={path} stroke="#F6DC97" strokeWidth={16} fill="none" strokeLinecap="round" />
          </Svg>
        ) : null}
        {width > 0
          ? shown.map((stone, i) => {
              const isCurrent = stone.number === current;
              const size = isCurrent ? CURRENT : STONE;
              const x = points[i].x;
              const y = points[i].y;
              return (
                <View key={stone.number} style={[styles.slot, { left: x - size / 2, top: y - size / 2 }]}>
                  {isCurrent && progress !== undefined ? (
                    <Svg width={ring * 2 + 6} height={ring * 2 + 6} style={[styles.ring, { left: size / 2 - ring - 3, top: size / 2 - ring - 3 }]}>
                      <Circle cx={ring + 3} cy={ring + 3} r={ring} stroke="rgba(0,0,0,0.18)" strokeWidth={4} fill="none" />
                      <Circle
                        cx={ring + 3}
                        cy={ring + 3}
                        r={ring}
                        stroke="#FFE45C"
                        strokeWidth={4}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${circumference * fill} ${circumference}`}
                        transform={`rotate(-90 ${ring + 3} ${ring + 3})`}
                      />
                    </Svg>
                  ) : null}
                  <LevelStone stone={{ ...stone, state: isCurrent ? 'current' : stone.state }} size={size} showStars={false} />
                  {isCurrent ? (
                    <Animated.View
                      style={[
                        styles.animal,
                        { left: size / 2 - 17, transform: [{ translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] },
                      ]}
                    >
                      <Image source={FLUENT[animal]} style={styles.animalImage} />
                    </Animated.View>
                  ) : null}
                </View>
              );
            })
          : null}
      </View>
      <View style={styles.count} pointerEvents="none">
        <Text style={styles.countText}>{`LEVEL ${current}/${total}`}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Room above the strip for the animal to stand on the current stone.
  wrap: { paddingTop: 16 },
  meadow: {
    height: HEIGHT,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: palette.white,
    overflow: 'visible',
  },
  clip: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 17, overflow: 'hidden' },
  slot: { position: 'absolute' },
  ring: { position: 'absolute' },
  animal: { position: 'absolute', top: -30 },
  animalImage: { width: 34, height: 34 },
  count: {
    position: 'absolute',
    right: 14,
    top: 4,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 9,
    backgroundColor: '#7A4419',
    borderWidth: 2,
    borderColor: palette.white,
  },
  countText: { fontFamily: font.black, fontSize: 10, color: '#FFE9B8' },
});
