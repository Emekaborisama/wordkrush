import { StyleSheet, View } from 'react-native';
import { isAtRisk, type DailyStreak } from '../../streak/types';
import { theme } from '../theme';
import { Stat } from './Stat';

type Props = {
  streak: DailyStreak;
  /** Today's local `YYYY-MM-DD`, so the at-risk check matches what the
      caller already computed when it last called `recordPlay`. */
  today: string;
};

/** Hub header flame. Dims and drops the border when today's run has not
    landed yet — the Duolingo "streak in danger" read, not a plain count. */
export function StreakBadge({ streak, today }: Props) {
  if (streak.current === 0) return null;
  const atRisk = isAtRisk(streak, today);

  return (
    <View style={[styles.pill, atRisk && styles.atRisk]}>
      <Stat
        value={streak.current}
        label={atRisk ? 'PLAY TODAY' : 'DAY STREAK'}
        variant="streak"
        size="md"
        align="center"
        color={atRisk ? theme.textMuted : theme.warning}
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
    borderColor: theme.warningSoft,
    backgroundColor: theme.warningSoft,
  },
  atRisk: {
    borderColor: theme.border,
    backgroundColor: theme.bgElevated,
    opacity: 0.76,
  },
});
