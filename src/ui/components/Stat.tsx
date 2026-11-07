import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font, palette, type } from '../theme';

type Props = {
  value: number | string;
  label: string;
  /** Streak-shaped stats get the flame treatment: a streak is something you
      protect, not just a number. */
  variant?: 'default' | 'streak';
  size?: 'md' | 'lg';
  color?: string;
  align?: 'left' | 'center';
  icon?: ReactNode;
};

/**
 * Value-over-label in navy, for cream boxes. One component, one hierarchy.
 */
export function Stat({ value, label, variant = 'default', size = 'md', color, align = 'center', icon }: Props) {
  return (
    <View style={[styles.root, align === 'left' && styles.left]} accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.valueRow}>
        {icon ?? (variant === 'streak' ? <FlameMark /> : null)}
        <Text style={[size === 'lg' ? styles.valueLg : styles.valueMd, { color: color ?? palette.ink }]}>{value}</Text>
      </View>
      <Text style={[type.overline, styles.label, align === 'left' && styles.left]}>{label}</Text>
    </View>
  );
}

function FlameMark() {
  return (
    <View style={styles.flame} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.flameCore} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center' },
  left: { alignItems: 'flex-start' },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  valueMd: { fontFamily: font.black, fontSize: 28, lineHeight: 33, fontVariant: ['tabular-nums'] },
  valueLg: { fontFamily: font.black, fontSize: 36, lineHeight: 42, fontVariant: ['tabular-nums'] },
  label: { color: palette.inkSoft, marginTop: 1 },
  flame: {
    width: 18,
    height: 22,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 12,
    backgroundColor: palette.orange,
    transform: [{ rotate: '18deg' }],
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 3,
    marginRight: 2,
  },
  flameCore: { width: 7, height: 9, borderRadius: 5, backgroundColor: '#FFF1A8' },
});
