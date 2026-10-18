import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { isAtRisk, type DailyStreak } from '../../streak/types';
import { GameIcon } from '../icons/GameIcon';
import { palette, shadow, space, tone } from '../theme';
import { BlockLogo } from './BlockLogo';
import { Gradient } from './Gradient';
import { ResourcePill } from './ResourcePill';
import { SquareButton } from './SquareButton';
import { StrokeText } from './StrokeText';

export type TopBarProps = {
  /** Back to the parent screen. Without it the left slot shows `left`. */
  onBack?: () => void;
  backLabel?: string;
  /** Screen title in place of the logo. */
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * The kit's top bar: a coral band with a white rim and rounded foot. Lives /
 * logo / coins in the kit; streak / logo / coins here. Secondary screens put
 * a sky back button on the left and their title in the middle.
 */
export function TopBar({ onBack, backLabel = 'Go back', title, left, right, style }: TopBarProps) {
  return (
    <View style={[styles.bar, style]}>
      <View style={styles.clip}>
        <Gradient colors={[palette.coralTop, palette.coral, palette.coralBottom]} locations={[0, 0.55, 1]} />
        <View style={styles.shine} />
      </View>
      <View style={styles.side}>
        {onBack ? (
          <SquareButton
            icon={<GameIcon name="back" size={26} color={tone.sky.outline} />}
            accessibilityLabel={backLabel}
            onPress={onBack}
            tone="sky"
            size={44}
          />
        ) : (
          left
        )}
      </View>
      <View style={styles.center}>
        {title ? (
          <StrokeText size={22} stroke={palette.coralEdge} strokeWidth={2.2} depth={1.5} numberOfLines={1} accessibilityRole="header">
            {title}
          </StrokeText>
        ) : (
          <BlockLogo size="compact" layout="row" />
        )}
      </View>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

/** Daily flame in the top bar. At zero it invites a first run. */
export function StreakPill({ streak, today, onPress }: { streak: DailyStreak; today: string; onPress?: () => void }) {
  const atRisk = streak.current > 0 && isAtRisk(streak, today);
  const label =
    streak.current === 0
      ? 'Start a streak'
      : atRisk
        ? `${streak.current} day streak, play today to keep it`
        : `${streak.current} day streak`;
  return (
    <ResourcePill
      icon={<GameIcon name="flame" size={34} />}
      value={streak.current}
      suffix={streak.current === 0 ? 'START' : atRisk ? 'PLAY!' : streak.current === 1 ? 'DAY' : 'DAYS'}
      countUp={false}
      onPress={onPress}
      accessibilityLabel={label}
    />
  );
}

/** Coin total in the top bar, ticking up when it grows. */
export function CoinsPill({ coins, onPress }: { coins: number; onPress?: () => void }) {
  return (
    <ResourcePill
      icon={<GameIcon name="coin" size={34} />}
      value={coins}
      onPress={onPress}
      accessibilityLabel={`${coins.toLocaleString('en-US')} coins`}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderWidth: 3,
    borderTopWidth: 0,
    borderColor: palette.white,
    backgroundColor: palette.coral,
    ...shadow.card,
  },
  clip: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderBottomLeftRadius: 19,
    borderBottomRightRadius: 19,
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  side: { minWidth: 92, flexShrink: 0, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  center: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
});
