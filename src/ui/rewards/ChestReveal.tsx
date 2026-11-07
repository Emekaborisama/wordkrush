import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { CHEST_COINS_BY_DAY } from '../../rewards/config';
import type { ChestDay } from '../../rewards/types';
import { GameIcon, GoldText, Rays, StrokeText } from '../components';
import { CatMascot } from '../mascot/CatMascot';
import { font, palette, space, tone } from '../theme';
import { useReduceMotion } from '../useReduceMotion';

const DAYS: readonly ChestDay[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * The opened daily chest: it wobbles, bursts open into the coin count with
 * the cat cheering beside it, and the week's chests run underneath — days
 * already opened ticked, today's ringed, and day 7's big chest ahead, after
 * the reference's day 5 / 6 / 7 reward row.
 */
export function ChestReveal({ day, coins, visible }: { day: number; coins: number; visible: boolean }) {
  const reduceMotion = useReduceMotion();
  const wobble = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) {
      wobble.setValue(0);
      burst.setValue(1);
      return;
    }
    wobble.setValue(0);
    burst.setValue(0);
    const run = Animated.sequence([
      Animated.timing(wobble, { toValue: 1, duration: 520, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(burst, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(2.2)), useNativeDriver: true }),
    ]);
    run.start();
    return () => run.stop();
  }, [visible, reduceMotion, wobble, burst]);

  const tilt = wobble.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: ['0deg', '-8deg', '8deg', '-6deg', '4deg', '0deg'] });
  const chestScale = burst.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1.22, 1] });
  const prize = burst.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const next = day >= 7 ? null : (day + 1) as ChestDay;

  return (
    <View style={styles.root}>
      <View style={styles.stage}>
        <View style={styles.rays} pointerEvents="none">
          <Rays size={260} />
        </View>
        <CatMascot size={92} mood="cheer" style={styles.cat} />
        <Animated.View style={{ transform: [{ rotate: tilt }, { scale: chestScale }] }}>
          <GameIcon name="chest" size={104} />
        </Animated.View>
      </View>
      <Animated.View style={[styles.prize, { opacity: burst, transform: [{ scale: prize }] }]}>
        <GoldText text={`+${coins}`} size={44} accessibilityLabel={`${coins} coins`} />
        <StrokeText size={18} stroke={palette.coralEdge} strokeWidth={2} depth={1.5}>
          coins in your pocket
        </StrokeText>
      </Animated.View>

      <View style={styles.track} accessibilityLabel={`Day ${day} of 7 opened`}>
        {DAYS.map((d) => {
          const opened = d < day;
          const today = d === day;
          const big = d === 7;
          return (
            <View
              key={d}
              style={[styles.cell, big && styles.cellBig, opened && styles.cellOpened, today && styles.cellToday]}
              accessible
              accessibilityLabel={`Day ${d}, ${CHEST_COINS_BY_DAY[d]} coins${opened ? ', opened' : today ? ', today' : ''}`}
            >
              <Text style={[styles.dayLabel, today && styles.dayLabelToday]}>{`DAY ${d}`}</Text>
              <GameIcon name={big ? 'chest' : 'coin'} size={big ? 30 : 22} />
              <Text style={styles.amount}>{CHEST_COINS_BY_DAY[d]}</Text>
              {opened || today ? (
                <View style={styles.tick}>
                  <GameIcon name="check" size={12} color={tone.green.outline} />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      {next ? (
        <StrokeText size={14} stroke={palette.coralEdge} strokeWidth={1.5} depth={1}>
          {next === 7 ? `Tomorrow: the big chest, +${CHEST_COINS_BY_DAY[7]}` : `Tomorrow: +${CHEST_COINS_BY_DAY[next]}`}
        </StrokeText>
      ) : (
        <StrokeText size={14} stroke={palette.coralEdge} strokeWidth={1.5} depth={1}>
          Week complete. Day 1 starts again tomorrow.
        </StrokeText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: space.sm },
  stage: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: space.xs, minHeight: 130 },
  rays: { position: 'absolute', alignSelf: 'center', top: -60, alignItems: 'center', justifyContent: 'center' },
  cat: { marginBottom: -6 },
  prize: { alignItems: 'center' },
  track: { flexDirection: 'row', gap: 4, alignSelf: 'stretch', justifyContent: 'center' },
  cell: {
    flex: 1,
    minWidth: 0,
    maxWidth: 44,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: palette.creamEdge,
    backgroundColor: palette.creamFill,
  },
  cellBig: { maxWidth: 56, flex: 1.3, backgroundColor: '#FFF3B8', borderColor: palette.goldDeep },
  cellOpened: { opacity: 0.6 },
  cellToday: { borderColor: palette.goldDeep, borderWidth: 3, backgroundColor: '#FFF3B8' },
  dayLabel: { fontFamily: font.heavy, fontSize: 8, letterSpacing: 0.4, color: palette.inkSoft },
  dayLabelToday: { color: palette.tealInk },
  amount: { fontFamily: font.black, fontSize: 11, color: palette.ink },
  tick: {
    position: 'absolute',
    bottom: -7,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    borderWidth: 2,
    borderColor: tone.green.bottom,
  },
});
