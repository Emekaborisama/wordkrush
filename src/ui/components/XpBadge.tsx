import { StyleSheet, Text, View } from 'react-native';
import { font, interaction, palette, radius } from '../theme';
import { PressableScale } from './PressableScale';

export type XpBadgeProps = {
  level: number;
  /** 0–1 fill of the thin bar under the level. */
  progress: number;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/**
 * Level number in a purple circle plus a thin bar. `onPress` is how a screen
 * opens the badges sheet. This component does not navigate.
 */
export function XpBadge({ level, progress, onPress, accessibilityLabel }: XpBadgeProps) {
  const label = accessibilityLabel ?? `Level ${level}`;
  const fraction = Math.max(0, Math.min(1, progress));
  const body = (
    <View style={styles.body}>
      <View style={styles.circle}>
        <Text style={styles.level}>{level}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
      </View>
    </View>
  );
  if (!onPress) {
    return (
      <View accessibilityLabel={label} style={styles.hit}>
        {body}
      </View>
    );
  }
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      translateOnPress={false}
      style={styles.hit}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hit: { minWidth: interaction.minTouch, minHeight: interaction.minTouch, alignItems: 'center', justifyContent: 'center' },
  body: { alignItems: 'center', gap: 4 },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  level: { color: palette.white, fontFamily: font.bold, fontWeight: '700', fontSize: 14 },
  track: { width: 36, height: 4, borderRadius: radius.pill, backgroundColor: palette.sand, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: palette.purple, borderRadius: radius.pill },
});
