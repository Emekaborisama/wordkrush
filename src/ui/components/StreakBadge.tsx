import type { DailyStreak } from '../../streak/types';
import { StreakPill } from './TopBar';

type Props = {
  streak: DailyStreak;
  /** Today's local `YYYY-MM-DD`, so the at-risk check matches what the
      caller already computed when it last called `recordPlay`. */
  today: string;
};

/** Daily flame. Kept under its old name; it is the top bar's streak pill. */
export function StreakBadge({ streak, today }: Props) {
  return <StreakPill streak={streak} today={today} />;
}
