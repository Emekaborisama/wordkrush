import { StyleSheet, Text, View } from 'react-native';
import { isAtRisk, type DailyStreak } from '../../streak/types';
import { font, labelFloorPx, palette, theme } from '../theme';
import { Stat } from './Stat';

type Props = {
  streak: DailyStreak;
  /** Today's local `YYYY-MM-DD`, so the at-risk check matches what the
      caller already computed when it last called `recordPlay`. */
  today: string;
};

/**
 * Hub header flame. At zero it invites a first run instead of disappearing.
 * At risk it changes the border and the copy; it does not fade the label,
 * which used to drop the text under 4.5:1.
 */
export function StreakBadge({ streak, today }: Props) {
  if (streak.current === 0) {
    return (
      <View style={[styles.pill, styles.idle]} accessibilityRole="text" accessibilityLabel="Start a streak">
        <View style={styles.flame} accessibilityElementsHidden importantForAccessibility="no">
          <View style={styles.flameCore} />
        </View>
        <Text style={styles.start}>Start a streak</Text>
      </View>
    );
  }
  const atRisk = isAtRisk(streak, today);

  return (
    <View style={[styles.pill, atRisk && styles.atRisk]}>
      <Stat
        value={streak.current}
        label={atRisk ? 'PLAY TODAY' : 'DAY STREAK'}
        variant="streak"
        size="md"
        align="center"
        color={atRisk ? theme.text : palette.brown}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.warning,
    backgroundColor: theme.warningSoft,
  },
  idle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  atRisk: {
    borderColor: theme.borderStrong,
    backgroundColor: theme.card,
  },
  start: {
    color: theme.text,
    fontFamily: font.semibold,
    fontWeight: '600',
    fontSize: Math.max(labelFloorPx, 13),
    lineHeight: 18,
  },
  flame: {
    width: 14,
    height: 18,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 3,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 10,
    backgroundColor: theme.warning,
    transform: [{ rotate: '18deg' }],
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  flameCore: {
    width: 5,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.paper,
  },
});
