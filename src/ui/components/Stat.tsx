import { StyleSheet, Text, View } from 'react-native';
import { theme, type } from '../theme';

type Props = {
  value: number | string;
  label: string;
  /** Streak-shaped stats get the flame treatment (Duolingo cue: a streak
      is not just a number, it is something you protect). */
  variant?: 'default' | 'streak';
  size?: 'md' | 'lg';
  color?: string;
  align?: 'left' | 'center';
};

/**
 * Value-over-label. This exact pattern appeared three times with drifting
 * font sizes: Home's best-streak box, Scores' rank stat row, Game's header
 * streak counter. One component, one hierarchy.
 */
export function Stat({ value, label, variant = 'default', size = 'md', color, align = 'center' }: Props) {
  return (
    <View style={[styles.root, align === 'left' && styles.left]}>
      <View style={styles.valueRow}>
        {variant === 'streak' && <Text style={styles.flame}>🔥</Text>}
        <Text
          style={[
            size === 'lg' ? type.display : styles.valueMd,
            styles.tabular,
            { color: color ?? theme.text },
          ]}
        >
          {value}
        </Text>
      </View>
      <Text style={[type.overline, styles.label, align === 'left' && styles.left]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center' },
  left: { alignItems: 'flex-start' },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  valueMd: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  tabular: { fontVariant: ['tabular-nums'] },
  flame: { fontSize: 20 },
  label: { color: theme.textDim, marginTop: 2 },
});
