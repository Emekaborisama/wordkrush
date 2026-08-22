import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font, theme, type } from '../theme';

type Props = {
  value: number | string;
  label: string;
  /** Streak-shaped stats get the flame treatment (Duolingo cue: a streak
      is not just a number, it is something you protect). */
  variant?: 'default' | 'streak';
  size?: 'md' | 'lg';
  color?: string;
  align?: 'left' | 'center';
  icon?: ReactNode;
};

/**
 * Value-over-label. This exact pattern appeared three times with drifting
 * font sizes: Home's best-streak box, Scores' rank stat row, Game's header
 * streak counter. One component, one hierarchy.
 */
export function Stat({
  value,
  label,
  variant = 'default',
  size = 'md',
  color,
  align = 'center',
  icon,
}: Props) {
  return (
    <View
      style={[styles.root, align === 'left' && styles.left]}
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={styles.valueRow}>
        {icon ?? (variant === 'streak' ? <FlameMark /> : null)}
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

function FlameMark() {
  return (
    <View style={styles.flame} accessibilityElementsHidden importantForAccessibility="no">
      <View style={styles.flameCore} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center' },
  left: { alignItems: 'flex-start' },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  valueMd: { fontFamily: font.bold, fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  tabular: { fontVariant: ['tabular-nums'] },
  label: { color: theme.textDim, marginTop: 2 },
  flame: {
    width: 18,
    height: 22,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 12,
    backgroundColor: theme.warning,
    transform: [{ rotate: '18deg' }],
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 3,
    marginRight: 2,
  },
  flameCore: {
    width: 7,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#FFF1A8',
  },
});
