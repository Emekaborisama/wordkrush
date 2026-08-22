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
      <Stat value={streak.current} label="DAY STREAK" variant="streak" size="md" align="center" />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bgElevated,
  },
  atRisk: { opacity: 0.55 },
});
