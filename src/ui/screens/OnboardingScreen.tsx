import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { BlockLogo, BlockTile, Button, GameIcon, SkyBackground, StrokeText } from '../components';
import { font, palette, space } from '../theme';
import { useReduceMotion } from '../useReduceMotion';

type Props = {
  onPlay: () => void;
  onExplore: () => void;
};

/** A little stack of cubes for the hand to tap, as in the kit's hero. */
const CUBES: ReadonlyArray<{ color: 'pink' | 'yellow' | 'green' | 'teal' | 'purple' | 'orange'; x: number; y: number }> = [
  { color: 'pink', x: 0, y: 1 },
  { color: 'yellow', x: 1, y: 1 },
  { color: 'green', x: 2, y: 1 },
  { color: 'teal', x: 1, y: 0 },
  { color: 'purple', x: 2, y: 0 },
  { color: 'orange', x: 3, y: 1 },
];
const CUBE = 46;

/**
 * One welcome page, shown once before any score exists: the kit's hero —
 * the block logo dropping in over the sky, the owner's first-run line, a hand
 * tapping a cube, and a big gold Play.
 */
export function OnboardingScreen({ onPlay, onExplore }: Props) {
  const reduceMotion = useReduceMotion();
  const tap = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      tap.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(tap, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(tap, { toValue: 0, duration: 380, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
        Animated.delay(900),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, tap]);

  return (
    <View style={styles.root}>
      <SkyBackground variant="sky" />
      <View style={styles.column}>
        <BlockLogo size="hero" animate />
        <StrokeText size={24} stroke={palette.navyDeep} strokeWidth={2.5} depth={2} lineHeight={30} style={styles.line}>
          Guess right. Keep the streak alive.
        </StrokeText>

        <View style={styles.cluster} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {CUBES.map((cube, index) => (
            <View key={index} style={[styles.cube, { left: cube.x * (CUBE + 2), top: cube.y * (CUBE + 2) }]}>
              <BlockTile size={CUBE} color={cube.color} state={index === 1 ? 'selected' : 'normal'} />
            </View>
          ))}
          <Animated.View
            style={[
              styles.hand,
              {
                transform: [
                  { translateY: tap.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) },
                  { scale: tap.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }) },
                ],
              },
            ]}
          >
            <GameIcon name="hand" size={70} />
          </Animated.View>
        </View>

        <Text style={styles.body}>Three quick games. One flame. Come back tomorrow.</Text>
        <Button title="Play" tone="gold" size="xl" onPress={onPlay} accessibilityLabel="Play your first game" />
        <Button title="All games" tone="blue" size="md" onPress={onExplore} accessibilityLabel="Explore games" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 5,
    backgroundColor: palette.skyMid,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
    gap: space.md,
  },
  line: { maxWidth: 340 },
  cluster: { width: CUBE * 4 + 6, height: CUBE * 2 + 2, marginVertical: space.sm },
  cube: { position: 'absolute' },
  hand: { position: 'absolute', left: CUBE + 4, top: CUBE * 0.55 },
  body: {
    fontFamily: font.heavy,
    fontSize: 15,
    lineHeight: 21,
    color: palette.white,
    textAlign: 'center',
    textShadowColor: palette.navyDeep,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    maxWidth: 320,
  },
});
