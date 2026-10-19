import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { closeness } from '../games/clueless/engine';
import type { Guess } from '../games/clueless/types';
import { font, motion, palette, proximityColor, space, tone, withAlpha } from './theme';

/**
 * One guess in the list: a cream row like the kit's level rows, a heat bar
 * across it in the proximity colour, and the rank on a chip of that colour.
 *
 * The newest row animates: the bar springs out to its width while the rank
 * counts up to its value. Older rows render statically — animating the whole
 * list on every guess would be noise, and would re-run on each keystroke.
 */
export function GuessRow({
  guess,
  rankedCount,
  animate,
}: {
  guess: Guess;
  rankedCount: number;
  animate: boolean;
}) {
  const fraction = closeness(guess.rank, rankedCount);
  const isWin = guess.rank === 1;
  const color = isWin ? tone.green.bottom : proximityColor(fraction);

  // `width` cannot use the native driver, so this stays on the JS thread —
  // acceptable because only one row animates at a time.
  const grow = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const lift = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const [shown, setShown] = useState(animate && guess.rank !== null ? 0 : guess.rank ?? 0);

  useEffect(() => {
    if (!animate) return;

    Animated.parallel([
      Animated.spring(grow, { toValue: 1, ...motion.gentle, useNativeDriver: false }),
      Animated.spring(lift, { toValue: 1, ...motion.snappy, useNativeDriver: true }),
    ]).start();

    if (guess.rank === null) return;
    // Count the rank up alongside the bar. Eased so it decelerates into the
    // final number rather than stopping dead.
    const target = guess.rank;
    const start = Date.now();
    let frame: number;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / motion.countMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else setShown(target);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, guess.rank, grow, lift]);

  return (
    <Animated.View
      style={[
        styles.row,
        animate && {
          opacity: lift,
          transform: [
            { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
          ],
        },
      ]}
    >
      {/* A cold guess has no heat, so it draws no bar at all — a sliver read
          as a rendering fault. */}
      {guess.rank === null ? null : (
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: color,
            opacity: 0.38,
            width: grow.interpolate({
              inputRange: [0, 1],
              // Never fully empty: a very cold guess should still read as a
              // row with a marker, not a rendering failure.
              outputRange: ['4%', `${Math.max(4, fraction * 100)}%`],
            }),
          },
        ]}
      />
      )}
      {/* Soft inner edge on the bar's leading edge gives it a lit quality
          instead of looking like a flat block of colour. */}
      <View style={styles.sheen} pointerEvents="none" />

      <View style={styles.content}>
        <Text style={[styles.word, isWin && styles.wordWin]} numberOfLines={1}>
          {guess.word}
        </Text>
        <View style={[styles.rankBadge, { backgroundColor: color, borderColor: withAlpha(palette.ink, 0.35) }]}>
          <Text style={[styles.rank, isWin && styles.rankWin]}>
            {guess.rank === null ? 'COLD' : isWin ? '✓' : `#${shown.toLocaleString()}`}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 50,
    borderRadius: 12,
    backgroundColor: palette.creamFill,
    borderWidth: 2,
    borderColor: palette.creamEdge,
    borderBottomColor: palette.white,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 4,
    backgroundColor: withAlpha(palette.white, 0.45),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    gap: space.sm,
  },
  word: { fontFamily: font.black, fontSize: 17, lineHeight: 22, color: palette.ink, flex: 1 },
  wordWin: { fontSize: 19 },
  rankBadge: {
    minWidth: 64,
    minHeight: 30,
    paddingHorizontal: space.sm,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rank: {
    fontFamily: font.black,
    fontSize: 14,
    lineHeight: 18,
    color: palette.white,
    fontVariant: ['tabular-nums'],
    textShadowColor: palette.navyDeep,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  rankWin: { fontSize: 17 },
});
