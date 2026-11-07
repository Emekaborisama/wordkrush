import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { feedback } from '../native/feedback';
import { Gradient } from './components';
import { LevelStone } from './components/LevelStone';
import { FLUENT, type FluentName } from './fluent';
import type { Stone } from './levelTrail';
import { font, space } from './theme';
import { useReduceMotion } from './useReduceMotion';

export type MeadowHop = {
  /** New per ride, so a second ride replays from the start. */
  key: number;
  /** The level just cleared, with its stars. */
  from: Stone;
  /** The level the animal hops to. */
  to: Stone;
  animal: FluentName;
};

/** Milliseconds for each beat of the hop. */
const BEAT = { cover: 180, stars: 320, hop: 900, hold: 450, uncover: 340, still: 800 } as const;
const STONE = 92;

/**
 * The animal's hop to the next level: the I Sabi Lagos ride in the Animal
 * Heroes meadow. The meadow covers the screen and the next level loads under
 * it (`onCovered`); the cleared stone shows its stars; the game's 3D animal
 * hops along the sandy path to the next stone under a wooden sign naming it;
 * then the meadow lifts. Reduce-motion puts the animal on the new stone and
 * only fades.
 */
export function MeadowRide({ ride, onCovered, onDone }: { ride: MeadowHop | null; onCovered: () => void; onDone: () => void }) {
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();
  const cover = useRef(new Animated.Value(0)).current;
  const stars = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const boarded = useRef<number | null>(null);
  const covered = useRef(onCovered);
  const done = useRef(onDone);
  covered.current = onCovered;
  done.current = onDone;
  const key = ride?.key;

  useEffect(() => {
    if (key === undefined) return;
    cover.setValue(0);
    stars.setValue(0);
    hop.setValue(reduceMotion ? 1 : 0);
    let stopped = false;
    const rest = reduceMotion
      ? Animated.sequence([
          Animated.delay(BEAT.still),
          Animated.timing(cover, { toValue: 0, duration: BEAT.uncover, easing: Easing.linear, useNativeDriver: true }),
        ])
      : Animated.sequence([
          Animated.timing(stars, { toValue: 1, duration: BEAT.stars, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
          Animated.timing(hop, { toValue: 1, duration: BEAT.hop, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.delay(BEAT.hold),
          Animated.timing(cover, { toValue: 0, duration: BEAT.uncover, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]);
    Animated.timing(cover, { toValue: 1, duration: BEAT.cover, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
      if (stopped) return;
      if (boarded.current !== key) {
        boarded.current = key;
        covered.current();
        feedback('levelUp');
      }
      if (reduceMotion) stars.setValue(1);
      rest.start(({ finished }) => {
        if (finished && !stopped) done.current();
      });
    });
    return () => {
      stopped = true;
      cover.stopAnimation();
      stars.stopAnimation();
      hop.stopAnimation();
    };
  }, [key, reduceMotion, cover, stars, hop]);

  if (!ride) return null;

  const column = Math.min(width, 500);
  const fromX = column * 0.24;
  const toX = column * 0.76;
  const travel = toX - fromX;
  // Three hops along the way: up and down three times as it crosses.
  const lift = hop.interpolate({
    inputRange: [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1],
    outputRange: [0, -46, 0, -46, 0, -46, 0],
  });
  const path = `M${fromX} 150 C${fromX + travel * 0.3} 110 ${fromX + travel * 0.7} 190 ${toX} 150`;

  return (
    <Animated.View
      style={[styles.root, { opacity: cover }]}
      accessibilityLiveRegion="polite"
      accessibilityViewIsModal
      accessibilityLabel={`Level ${ride.to.number}${ride.to.name ? `: ${ride.to.name}` : ''}`}
    >
      <Gradient colors={['#A8E37E', '#62B947', '#469A33']} locations={[0, 0.55, 1]} />
      <View style={styles.middle}>
        <View style={styles.sign}>
          <Gradient colors={['#C98B4E', '#9C5F2B', '#7A4419']} locations={[0, 0.5, 1]} />
          <Text style={styles.signEyebrow}>{`LEVEL ${ride.to.number}`}</Text>
          {ride.to.name ? (
            <Text style={styles.signTitle} numberOfLines={1}>
              {ride.to.name}
            </Text>
          ) : null}
        </View>
        <View style={[styles.stage, { width: column }]}>
          <Svg width={column} height={300} style={StyleSheet.absoluteFill}>
            <Path d={path} stroke="#B9873A" strokeWidth={50} fill="none" strokeLinecap="round" />
            <Path d={path} stroke="#F6DC97" strokeWidth={40} fill="none" strokeLinecap="round" />
          </Svg>
          {/* Scenery clear of the cleared stone's stars and the animal's arc. */}
          <Image source={FLUENT.tree} style={[styles.scenery, { left: column * 0.8, top: -36 }]} />
          <Image source={FLUENT.tulip} style={[styles.flower, { left: column * 0.5 - 24, top: 214 }]} />
          <Image source={FLUENT.sunflower} style={[styles.flower, { left: column * 0.08, top: 226 }]} />
          <View style={[styles.stoneSlot, { left: fromX - STONE / 2 }]}>
            <Animated.View style={{ transform: [{ scale: stars.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
              <LevelStone stone={{ ...ride.from, state: 'cleared' }} size={STONE} />
            </Animated.View>
          </View>
          <View style={[styles.stoneSlot, { left: toX - STONE / 2 }]}>
            <LevelStone stone={{ ...ride.to, state: 'current' }} size={STONE} showStars={false} />
          </View>
          <Animated.View
            style={[
              styles.animal,
              {
                left: fromX - 42,
                transform: [{ translateX: hop.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) }, { translateY: lift }],
              },
            ]}
          >
            <Image source={FLUENT[ride.animal]} style={styles.animalImage} />
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  sign: {
    minWidth: 240,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#4A2810',
    overflow: 'hidden',
    alignItems: 'center',
  },
  signEyebrow: { fontFamily: font.black, fontSize: 16, letterSpacing: 2, color: '#FFE9B8' },
  signTitle: {
    fontFamily: font.black,
    fontSize: 30,
    color: '#FFFFFF',
    textShadowColor: '#4A2810',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  stage: { height: 300 },
  scenery: { position: 'absolute', width: 96, height: 96 },
  flower: { position: 'absolute', width: 48, height: 48 },
  stoneSlot: { position: 'absolute', top: 150 - STONE / 2 },
  animal: { position: 'absolute', top: 150 - STONE / 2 - 70 },
  animalImage: { width: 84, height: 84 },
});
