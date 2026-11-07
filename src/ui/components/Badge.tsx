import { StyleSheet, Text, View } from 'react-native';
import { font, labelFloorPx, palette, tone as tones, toneFrom, type GlossTone } from '../theme';

type Props = {
  label: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  color?: string;
};

const TONES: Record<NonNullable<Props['tone']>, GlossTone> = {
  neutral: tones.grey,
  accent: tones.teal,
  success: tones.green,
  warning: tones.gold,
  danger: tones.red,
};

/**
 * Small glossy tag — `SOON`, `NEW`, `BOOSTED`. A solid kit colour with a
 * darker rim and white lettering, like the kit's "Bonus" tag.
 */
export function Badge({ label, tone = 'neutral', color }: Props) {
  const face = color ? toneFrom(color) : TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: face.bottom, borderColor: face.outline }]}>
      <View style={styles.shine} />
      <Text style={[styles.text, { textShadowColor: face.outline }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  text: {
    fontFamily: font.black,
    fontSize: labelFloorPx,
    lineHeight: 14,
    letterSpacing: 0.8,
    color: palette.white,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
