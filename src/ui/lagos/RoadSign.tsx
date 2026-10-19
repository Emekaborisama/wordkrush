import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { font, palette, shadow } from '../theme';
import { danfo } from './danfoTheme';

/**
 * A Lagos road sign: white-rimmed green panel, a small yellow line on top
 * ("STOP 1"), the place in big white letters, and an optional line under it.
 * Danfo Run puts its route on one of these; I Sabi Lagos names its levels with
 * them.
 */
export function RoadSign({
  eyebrow,
  title,
  subtitle,
  size = 'md',
  highlight = false,
  dim = false,
  style,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  /** The next stop: a danfo-yellow rim. */
  highlight?: boolean;
  dim?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const s = SIZE[size];
  return (
    <View style={[styles.rim, highlight && styles.rimHighlight, dim && styles.dim, style]}>
      <View style={[styles.panel, { paddingVertical: s.padY, paddingHorizontal: s.padX }]}>
        <View pointerEvents="none" style={styles.inner} />
        {eyebrow ? <Text style={[styles.eyebrow, { fontSize: s.eyebrow }]}>{eyebrow}</Text> : null}
        <Text style={[styles.title, { fontSize: s.title, lineHeight: Math.round(s.title * 1.18) }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { fontSize: s.subtitle }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const SIZE = {
  sm: { padY: 5, padX: 10, eyebrow: 10, title: 15, subtitle: 11 },
  md: { padY: 8, padX: 14, eyebrow: 11, title: 20, subtitle: 12 },
  lg: { padY: 10, padX: 18, eyebrow: 13, title: 28, subtitle: 14 },
} as const;

const styles = StyleSheet.create({
  rim: {
    borderRadius: 14,
    padding: 3,
    backgroundColor: palette.white,
    ...shadow.card,
  },
  rimHighlight: { backgroundColor: danfo.yellow },
  dim: { opacity: 0.55 },
  panel: { borderRadius: 11, backgroundColor: danfo.sign, overflow: 'hidden' },
  inner: {
    position: 'absolute',
    top: 3,
    right: 3,
    bottom: 3,
    left: 3,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  eyebrow: { fontFamily: font.black, color: danfo.yellow, letterSpacing: 1 },
  title: { fontFamily: font.black, color: palette.white },
  subtitle: { fontFamily: font.heavy, color: danfo.signText },
});
