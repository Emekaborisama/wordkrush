import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { feedback } from '../native/feedback';
import { GameIcon, Gradient } from './components';
import { LevelStone } from './components/LevelStone';
import { FLUENT } from './fluent';
import type { Stone } from './levelTrail';
import { CatMascot } from './mascot/CatMascot';
import { bezierPoint, rideSamples } from './rideMath';
import { font, space } from './theme';
import { useReduceMotion } from './useReduceMotion';

export type MeadowHop = {
  /** New per ride, so a second ride replays from the start. */
  key: number;
  /** The level just cleared, with its stars. */
  from: Stone;
  /** The level the cat walks to. */
  to: Stone;
};

/** Milliseconds for each beat of the walk. */
const BEAT = { cover: 180, stars: 320, walk: 1050, land: 260, hold: 380, uncover: 340, still: 800 } as const;
const STONE = 92;
const CAT = 96;
/** Paw prints left behind on the path, at these fractions of the walk. */
const PRINTS = [0.16, 0.32, 0.5, 0.66, 0.82] as const;
/** Sparkles lifting off the cleared stone. */
const SPARKS = [
  { dx: -34, dy: -64 },
  { dx: 0, dy: -84 },
  { dx: 36, dy: -60 },
] as const;

/**
 * The walk to the next level: the I Sabi Lagos ride, in the Animal Heroes
 * meadow, with the WordKrush cat. The meadow covers the screen and the next
 * level loads under it (`onCovered`); sparkles lift off the cleared stone;
 * the cat walks the sandy path in three hops, following its curve and
 * leaving paw prints, under a wooden sign naming the level; the next stone
 * pops as the cat lands on it; then the meadow lifts. About 2.5 s.
 * Reduce-motion puts the cat on the new stone and only fades.
 */
export function MeadowRide({ ride, onCovered, onDone }: { ride: MeadowHop | null; onCovered: () => void; onDone: () => void }) {
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();
  const cover = useRef(new Animated.Value(0)).current;
  const stars = useRef(new Animated.Value(0)).current;
  const walk = useRef(new Animated.Value(0)).current;
  const land = useRef(new Animated.Value(0)).current;
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
    walk.setValue(reduceMotion ? 1 : 0);
    land.setValue(reduceMotion ? 1 : 0);
    let stopped = false;
    const rest = reduceMotion
      ? Animated.sequence([
          Animated.delay(BEAT.still),
          Animated.timing(cover, { toValue: 0, duration: BEAT.uncover, easing: Easing.linear, useNativeDriver: true }),
        ])
      : Animated.sequence([
          Animated.timing(stars, { toValue: 1, duration: BEAT.stars, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
          Animated.timing(walk, { toValue: 1, duration: BEAT.walk, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(land, { toValue: 1, duration: BEAT.land, easing: Easing.out(Easing.back(3)), useNativeDriver: true }),
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
      walk.stopAnimation();
      land.stopAnimation();
    };
  }, [key, reduceMotion, cover, stars, walk, land]);

  if (!ride) return null;

  const column = Math.min(width, 500);
  const from = { x: column * 0.22, y: 150 };
  const to = { x: column * 0.78, y: 150 };
  const travel = to.x - from.x;
  const c1 = { x: from.x + travel * 0.3, y: 110 };
  const c2 = { x: from.x + travel * 0.7, y: 190 };
  const path = `M${from.x} ${from.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${to.x} ${to.y}`;

  // The cat follows the curve, with three hops on top of it.
  const samples = rideSamples(from, c1, c2, to, 12);
  const followX = walk.interpolate({ inputRange: samples.map((s) => s.t), outputRange: samples.map((s) => s.x - from.x) });
  const followY = walk.interpolate({ inputRange: samples.map((s) => s.t), outputRange: samples.map((s) => s.y - from.y) });
  const lift = walk.interpolate({
    inputRange: [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1],
    outputRange: [0, -46, 0, -46, 0, -46, 0],
  });
  const arrive = land.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.18, 1] });

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
          {/* Scenery clear of the cleared stone's stars and the cat's arc. */}
          <Image source={FLUENT.tree} style={[styles.scenery, { left: column * 0.8, top: -36 }]} />
          <Image source={FLUENT.tulip} style={[styles.flower, { left: column * 0.5 - 24, top: 214 }]} />
          <Image source={FLUENT.sunflower} style={[styles.flower, { left: column * 0.08, top: 226 }]} />
          {PRINTS.map((t, i) => {
            const point = bezierPoint(from, c1, c2, to, t);
            return (
              <Animated.View
                key={t}
                pointerEvents="none"
                style={[
                  styles.print,
                  {
                    left: point.x - 8,
                    top: point.y + (i % 2 === 0 ? -10 : 0),
                    opacity: walk.interpolate({ inputRange: [0, t - 0.02, t + 0.04, 1], outputRange: [0, 0, 0.55, 0.55] }),
                  },
                ]}
              >
                <Svg width={16} height={14} viewBox="0 0 16 14">
                  <Ellipse cx={8} cy={9} rx={5} ry={4} fill="#9C6A2A" />
                  <Ellipse cx={3} cy={4} rx={2} ry={2} fill="#9C6A2A" />
                  <Ellipse cx={8} cy={2} rx={2} ry={2} fill="#9C6A2A" />
                  <Ellipse cx={13} cy={4} rx={2} ry={2} fill="#9C6A2A" />
                </Svg>
              </Animated.View>
            );
          })}
          <View style={[styles.stoneSlot, { left: from.x - STONE / 2 }]}>
            <Animated.View style={{ transform: [{ scale: stars.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
              <LevelStone stone={{ ...ride.from, state: 'cleared' }} size={STONE} />
            </Animated.View>
            {reduceMotion
              ? null
              : SPARKS.map((spark) => (
                  <Animated.View
                    key={spark.dx}
                    pointerEvents="none"
                    style={[
                      styles.spark,
                      {
                        opacity: stars.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
                        transform: [
                          { translateX: stars.interpolate({ inputRange: [0, 1], outputRange: [0, spark.dx] }) },
                          { translateY: stars.interpolate({ inputRange: [0, 1], outputRange: [0, spark.dy] }) },
                          { scale: stars.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1.1, 0.8] }) },
                        ],
                      },
                    ]}
                  >
                    <GameIcon name="star" size={26} />
                  </Animated.View>
                ))}
          </View>
          <Animated.View style={[styles.stoneSlot, { left: to.x - STONE / 2, transform: [{ scale: arrive }] }]}>
            <LevelStone stone={{ ...ride.to, state: 'current' }} size={STONE} showStars={false} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cat,
              {
                left: from.x - CAT / 2,
                top: from.y - STONE / 2 - CAT + 34,
                transform: [{ translateX: followX }, { translateY: Animated.add(followY, lift) }],
              },
            ]}
          >
            <CatMascot size={CAT} mood="cheer" />
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
  print: { position: 'absolute' },
  stoneSlot: { position: 'absolute', top: 150 - STONE / 2 },
  spark: { position: 'absolute', left: STONE / 2 - 13, top: STONE / 2 - 13 },
  cat: { position: 'absolute' },
});
