import { StyleSheet, View } from 'react-native';
import { GameIcon } from '../icons/GameIcon';
import { interaction, palette, radius } from '../theme';
import { PressableScale } from './PressableScale';
import { StrokeText } from './StrokeText';

export type XpBadgeProps = {
  level: number;
  /** 0–1 fill of the thin bar under the level. */
  progress: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** The thin bar under the star; off where a wider bar sits beside it. */
  showBar?: boolean;
};

/**
 * Player level as a kit gold star with the number on it, over a thin purple
 * XP bar. `onPress` is how a screen opens more detail; this does not navigate.
 */
export function XpBadge({ level, progress, onPress, accessibilityLabel, showBar = true }: XpBadgeProps) {
  const label = accessibilityLabel ?? `Level ${level}`;
  const fraction = Math.max(0, Math.min(1, progress));
  const body = (
    <View style={styles.body}>
      <View style={styles.star}>
        <GameIcon name="star" size={40} />
        <View style={styles.number} pointerEvents="none">
          <StrokeText size={14} stroke={palette.goldEdge} strokeWidth={1.5} depth={1}>
            {level}
          </StrokeText>
        </View>
      </View>
      {showBar ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
        </View>
      ) : null}
    </View>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label} style={styles.hit}>
        {body}
      </View>
    );
  }
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.hit}>
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hit: { minWidth: interaction.minTouch, minHeight: interaction.minTouch, alignItems: 'center', justifyContent: 'center' },
  body: { alignItems: 'center', gap: 2 },
  star: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  number: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', paddingTop: 3 },
  track: {
    width: 40,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.navyDeep,
    borderWidth: 1,
    borderColor: palette.white,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: palette.purple, borderRadius: radius.pill },
});
