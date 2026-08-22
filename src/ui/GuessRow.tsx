import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { closeness } from '../games/clueless/engine';
import type { Guess } from '../games/clueless/types';
import { elevation, font, motion, proximityColor, radius, space, theme, type, withAlpha } from './theme';

/**
 * One guess in the list.
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
  const color = isWin ? theme.success : proximityColor(fraction);

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
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: color,
            opacity: 0.18,
            width: grow.interpolate({
              inputRange: [0, 1],
              // Never fully empty: a very cold guess should still read as a
              // row with a marker, not a rendering failure.
              outputRange: ['4%', `${Math.max(4, fraction * 100)}%`],
            }),
          },
        ]}
      />
      {/* Soft inner edge on the bar's leading edge gives it a lit quality
          instead of looking like a flat block of colour. */}
      <View style={styles.sheen} pointerEvents="none" />

      <View style={styles.content}>
        <Text style={[styles.word, isWin && styles.wordWin]} numberOfLines={1}>
          {guess.word}
        </Text>
        <View
          style={[
            styles.rankBadge,
            { backgroundColor: withAlpha(color, 0.16), borderColor: withAlpha(color, 0.44) },
          ]}
        >
          <Text style={[styles.rank, { color }, isWin && styles.rankWin]}>
            {guess.rank === null ? 'COLD' : isWin ? '✓' : `#${shown.toLocaleString()}`}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const depth = elevation(2);

const styles = StyleSheet.create({
  row: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: depth.backgroundColor,
    borderWidth: 1,
    borderColor: depth.borderColor,
    borderTopColor: depth.borderTopColor,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: depth.borderTopColor,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    gap: space.sm,
  },
  word: {
    ...type.bodyStrong,
    color: theme.text,
    flex: 1,
    // Text sits over both the bar and the empty track, so it needs a shadow to
    // stay legible against either.
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  wordWin: { ...type.subtitle, color: theme.text },
  rankBadge: {
    minWidth: 58,
    minHeight: 30,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rank: {
    ...type.caption,
    fontFamily: font.semibold,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  rankWin: { ...type.subtitle },
});
