import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge, Gradient, PressableScale, StrokeText } from './components';
import { danfo } from './lagos/danfoTheme';
import { font, palette, shadow, space } from './theme';

const LOOKS = {
  rival: { colors: ['#F9736A', '#DC2F4F', '#B01E42'], rim: palette.white, ink: palette.white, stroke: '#6E0F2A', outline: 1.6 },
  daily: { colors: ['#8ED8FF', '#3FA2F3', '#2A7FD6'], rim: palette.white, ink: palette.white, stroke: palette.navyDeep, outline: 1.6 },
  danfo: { colors: [danfo.yellowTop, danfo.yellow, danfo.yellowDeep], rim: danfo.black, ink: danfo.black, stroke: danfo.black, outline: 0 },
} as const;

/**
 * One way to play Higher or Lower, as a tile on Home. The whole tile is the
 * button, so the word "Play" stays on the gold button and the row of three
 * reads as a set. Stands upright on a phone; on a laptop the art sits beside
 * the words.
 */
export function ModeTile({
  look,
  art,
  title,
  subtitle,
  tag,
  wide,
  compact,
  onPress,
  accessibilityLabel,
}: {
  look: keyof typeof LOOKS;
  art: ReactNode;
  title: string;
  subtitle: string;
  /** Corner flag, such as NEW. */
  tag?: string;
  wide: boolean;
  /** A 320–360 wide phone, where three tiles get tight. */
  compact: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { colors, rim, ink, stroke, outline } = LOOKS[look];
  const size = wide ? 20 : compact ? 13 : 14;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.tile, { borderColor: rim }]}
    >
      <View style={styles.clip}>
        <Gradient colors={colors} locations={[0, 0.55, 1]} />
      </View>
      <View style={[styles.body, wide && styles.bodyWide]}>
        <View style={wide ? styles.artWide : styles.art}>{art}</View>
        <View style={wide ? styles.copyWide : styles.copy}>
          <StrokeText
            size={size}
            color={ink}
            stroke={stroke}
            strokeWidth={outline}
            depth={outline > 0 ? 1 : 0}
            align={wide ? 'left' : 'center'}
            numberOfLines={1}
          >
            {title}
          </StrokeText>
          <Text style={[styles.subtitle, wide && styles.subtitleWide, { color: ink, textAlign: wide ? 'left' : 'center' }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>
      {tag ? (
        <View style={styles.tag}>
          <Badge label={tag} tone="danger" />
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 0, borderRadius: 20, borderWidth: 3, ...shadow.card },
  clip: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 17, overflow: 'hidden' },
  body: { alignItems: 'center', gap: 2, paddingVertical: space.xs, paddingHorizontal: 4 },
  bodyWide: { flexDirection: 'row', gap: space.sm, paddingVertical: space.sm, paddingHorizontal: space.sm },
  art: { height: 48, alignItems: 'center', justifyContent: 'center' },
  artWide: { width: 96, height: 64, alignItems: 'center', justifyContent: 'center' },
  copy: { alignSelf: 'stretch' },
  copyWide: { flex: 1, minWidth: 0, gap: 2 },
  subtitle: { fontFamily: font.heavy, fontSize: 11, lineHeight: 14 },
  subtitleWide: { fontSize: 13, lineHeight: 17 },
  tag: { position: 'absolute', top: -8, right: -4 },
});
