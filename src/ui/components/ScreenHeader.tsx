import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font, palette, space } from '../theme';
import { StrokeText } from './StrokeText';

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  align?: 'left' | 'center';
  size?: 'display' | 'title';
  /** Trailing slot — an icon, a badge. */
  trailing?: ReactNode;
};

/** Title block for a screen on the sky: outlined white title, soft subtitle. */
export function ScreenHeader({ title, subtitle, eyebrow, align = 'left', size = 'display', trailing }: Props) {
  return (
    <View style={[styles.row, align === 'center' && styles.center]}>
      <View style={[styles.copy, align === 'center' && styles.center]}>
        {eyebrow ? <Text style={[styles.eyebrow, align === 'center' && styles.centerText]}>{eyebrow}</Text> : null}
        <StrokeText
          size={size === 'title' ? 24 : 32}
          stroke={palette.navyDeep}
          strokeWidth={size === 'title' ? 2 : 2.5}
          depth={2}
          align={align}
          accessibilityRole="header"
        >
          {title}
        </StrokeText>
        {subtitle ? <Text style={[styles.subtitle, align === 'center' && styles.centerText]}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md },
  copy: { flexShrink: 1 },
  center: { alignItems: 'center', width: '100%' },
  eyebrow: { fontFamily: font.heavy, fontSize: 12, letterSpacing: 1.2, color: palette.gold, marginBottom: 2 },
  subtitle: {
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 21,
    color: palette.white,
    marginTop: 2,
    textShadowColor: palette.navyDeep,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  centerText: { textAlign: 'center' },
});
