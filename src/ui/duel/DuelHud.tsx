import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { DUEL_MS, type DuelPlayer, type Progress } from '../../duel/rules';
import { CountryFlag } from '../components';
import { FLUENT } from '../fluent';
import { font, formatDuration, palette, space } from '../theme';
import { useReduceMotion } from '../useReduceMotion';

const URGENT_MS = 10_000;

/** A player's side of the HUD: flag, name and streak; the streak pops when it climbs. */
function Side({ player, label, streak, out, self }: { player: DuelPlayer; label: string; streak: number; out: boolean; self?: boolean }) {
  const reduceMotion = useReduceMotion();
  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduceMotion || streak === 0) return;
    pop.setValue(1.35);
    Animated.timing(pop, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(2)), useNativeDriver: true }).start();
  }, [streak, reduceMotion, pop]);
  return (
    <View style={[styles.side, self && styles.self, out && styles.out]}>
      <View style={styles.identity}>
        {player.ghost ? <Image source={FLUENT.ghost} style={styles.ghost} /> : null}
        <CountryFlag code={player.country} size={15} />
        <Text style={styles.name} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.scoreRow}>
        <Animated.Text style={[styles.score, { transform: [{ scale: pop }] }]}>{streak}</Animated.Text>
        {out ? <Text style={styles.outText}>OUT</Text> : null}
      </View>
    </View>
  );
}

/**
 * The 1v1 strip over the board: you, the clock, your opponent. Both streaks
 * update live and a player who has missed reads OUT, so the race is always
 * visible while you answer.
 */
export function DuelHud({
  me,
  opponent,
  mine,
  them,
  startedAt,
}: {
  me: DuelPlayer;
  opponent: DuelPlayer;
  mine: Progress;
  them: Progress;
  startedAt: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, DUEL_MS - (now - startedAt));
  const urgent = left <= URGENT_MS;
  return (
    <View style={styles.root}>
      <Side player={me} label="You" streak={mine.streak} out={mine.done} self />
      <View style={[styles.clock, urgent && styles.clockUrgent]} accessibilityLabel={`${Math.ceil(left / 1000)} seconds left`}>
        <Text style={[styles.clockText, urgent && styles.clockTextUrgent]}>{formatDuration(left)}</Text>
      </View>
      <Side player={opponent} label={opponent.name} streak={them.streak} out={them.done} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingBottom: space.xs },
  side: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: palette.creamEdge,
    backgroundColor: palette.creamFill,
  },
  self: { borderColor: palette.goldDeep, backgroundColor: '#FFF3B8' },
  out: { opacity: 0.6 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ghost: { width: 16, height: 16 },
  name: { flexShrink: 1, fontFamily: font.heavy, fontSize: 12, color: palette.inkSoft },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  score: { fontFamily: font.black, fontSize: 24, lineHeight: 28, color: palette.ink, fontVariant: ['tabular-nums'] },
  outText: { fontFamily: font.black, fontSize: 11, color: palette.red },
  clock: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: palette.navyDeep,
  },
  clockUrgent: { backgroundColor: palette.red },
  clockText: { fontFamily: font.black, fontSize: 16, color: palette.white, fontVariant: ['tabular-nums'] },
  clockTextUrgent: { color: palette.white },
});
