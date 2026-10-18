import { StyleSheet, Text } from 'react-native';
import { font, labelFloorPx, palette, radius, theme, withAlpha } from '../theme';

type Props = {
  label: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  color?: string;
};

/** Small bordered pill — `SOON`, `THIS RUN`. One shape instead of each screen
    hand-tuning its own padding/border/radius combination. */
export function Badge({ label, tone = 'neutral', color }: Props) {
  const toneColor =
    tone === 'accent'
      ? theme.accent
      : tone === 'success'
        ? theme.success
        : tone === 'warning'
          ? theme.warning
          : tone === 'danger'
            ? theme.danger
            : theme.textMuted;
  const c = color ?? toneColor;
  return (
    <Text
      style={[
        styles.badge,
        { color: palette.brown, borderColor: withAlpha(c, 0.55), backgroundColor: withAlpha(c, 0.16) },
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontFamily: font.semibold,
    fontWeight: '600',
    fontSize: labelFloorPx,
    letterSpacing: 0.8,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
    overflow: 'hidden',
  },
});
