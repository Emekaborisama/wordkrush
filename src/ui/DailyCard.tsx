import { Image, StyleSheet, Text, View } from 'react-native';
import { DAILY_PAIRS, type DailyResult } from '../games/more-or-less/daily';
import { Gradient, PressableScale, StrokeText } from './components';
import { FLUENT } from './fluent';
import { font, palette, space, shadow } from './theme';

/**
 * Daily 10 on Home: today's number, and either the call to play (the same ten
 * pairs for everyone) or today's score with the call to share it. One try a
 * day, so the card is the whole loop: play, share, come back tomorrow.
 */
export function DailyCard({
  number,
  result,
  onPlay,
  onShare,
}: {
  number: number;
  result: DailyResult | null;
  onPlay: () => void;
  onShare: () => void;
}) {
  const played = result !== null;
  const score = played ? Math.min(result.streak, DAILY_PAIRS) : 0;
  return (
    <PressableScale
      onPress={played ? onShare : onPlay}
      accessibilityRole="button"
      accessibilityLabel={
        played ? `Daily 10 number ${number}: ${score} of ${DAILY_PAIRS} today. Share it` : `Daily 10 number ${number}. Play today's ten pairs`
      }
      style={styles.card}
    >
      <View style={styles.clip}>
        <Gradient colors={['#8ED8FF', '#3FA2F3', '#2A7FD6']} locations={[0, 0.55, 1]} />
      </View>
      <View style={styles.row}>
        <Image source={FLUENT.calendar} style={styles.icon} />
        <View style={styles.copy}>
          <StrokeText size={13} stroke={palette.navyDeep} strokeWidth={1.4} depth={0} align="left">
            {`DAILY 10 · #${number}`}
          </StrokeText>
          <StrokeText size={20} stroke={palette.navyDeep} strokeWidth={2} depth={1.5} align="left" numberOfLines={1}>
            {played ? `Today: ${score}/${DAILY_PAIRS}${score >= DAILY_PAIRS ? ' 🔥' : ''}` : "Today's 10"}
          </StrokeText>
          <Text style={styles.meta}>{played ? 'New ten at midnight' : 'Same for everyone. One try.'}</Text>
        </View>
        <View style={[styles.pill, played ? styles.pillShare : styles.pillPlay]}>
          <Text style={styles.pillText}>{played ? 'Share' : 'Play'}</Text>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 3, borderColor: palette.white, ...shadow.card },
  clip: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 19, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm },
  icon: { width: 60, height: 60 },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  meta: { fontFamily: font.heavy, fontSize: 12, color: palette.white },
  pill: { paddingHorizontal: 16, minHeight: 40, borderRadius: 20, justifyContent: 'center', borderWidth: 2, borderColor: palette.white },
  pillPlay: { backgroundColor: '#3DB33A' },
  pillShare: { backgroundColor: '#F5A300' },
  pillText: { fontFamily: font.black, fontSize: 16, color: palette.white },
});
