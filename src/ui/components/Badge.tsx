import { StyleSheet, Text } from 'react-native';
import { radius, theme, type } from '../theme';

type Props = {
  label: string;
  tone?: 'neutral' | 'accent';
  color?: string;
};

/** Small bordered pill — `SOON`, `THIS RUN`. One shape instead of each screen
    hand-tuning its own padding/border/radius combination. */
export function Badge({ label, tone = 'neutral', color }: Props) {
  const c = color ?? (tone === 'accent' ? theme.accent : theme.textDim);
  return (
    <Text style={[type.overline, styles.badge, { color: c, borderColor: tone === 'accent' ? c : theme.border }]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 8.5,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: 'hidden',
  },
});
