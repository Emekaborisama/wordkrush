import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { space, theme, type } from '../theme';

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  align?: 'left' | 'center';
  size?: 'display' | 'title';
  /** Trailing slot — Hub's streak flame, an icon, a settings glyph. */
  trailing?: ReactNode;
};

/** Title + subtitle, the same block Hub, Home, and Scores each redrew with
    a different font size and gap. */
export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  align = 'left',
  size = 'display',
  trailing,
}: Props) {
  return (
    <View style={[styles.row, align === 'center' && styles.center]}>
      <View style={align === 'center' ? styles.center : undefined}>
        {eyebrow ? (
          <Text style={[type.overline, styles.eyebrow, align === 'center' && styles.centerText]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text
          style={[
            size === 'title' ? type.title : type.display,
            styles.title,
            align === 'center' && styles.centerText,
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.body, styles.subtitle, align === 'center' && styles.centerText]}>{subtitle}</Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md },
  center: { alignItems: 'center', width: '100%' },
  title: { color: theme.text },
  eyebrow: { color: theme.accent, marginBottom: space.xs },
  subtitle: { color: theme.textDim, marginTop: 3 },
  centerText: { textAlign: 'center' },
});
