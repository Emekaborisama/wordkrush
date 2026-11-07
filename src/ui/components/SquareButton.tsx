import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { font, interaction, labelFloorPx, palette, tone as tones, toneFrom, type Tone } from '../theme';
import { GlossFace } from './GlossFace';
import { PressableScale } from './PressableScale';
import { StrokeText } from './StrokeText';

export type SquareButtonProps = {
  icon: ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
  /** Face size in px, lip excluded. Never under 44. */
  size?: number;
  /** `square` is the kit's booster tile; `circle` its gold gear. */
  shape?: 'square' | 'circle';
  tone?: Tone;
  /** Any hex, when the colour is data. `tone` wins. */
  color?: string;
  /** Coin price on a cream chip across the foot of the tile. */
  price?: number;
  /** Count or alert on a red bubble at the top-right corner. */
  badge?: string | number;
  /** Word under the tile ("Shuffle"). */
  caption?: string;
  /** Caption ink. White (outlined) on sky, navy on cream. */
  captionTone?: 'light' | 'dark';
  disabled?: boolean;
  /** Read by assistive tech when disabled. */
  disabledReason?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Glossy icon tile: the kit's green booster squares, sky-blue home buttons
 * and gold gear. Same face, lip and press as `Button`.
 */
export function SquareButton({
  icon,
  accessibilityLabel,
  onPress,
  size = 56,
  shape = 'square',
  tone,
  color,
  price,
  badge,
  caption,
  captionTone = 'light',
  disabled = false,
  disabledReason,
  style,
}: SquareButtonProps) {
  const face = Math.max(interaction.minTouch, size);
  // An unaffordable booster keeps its colour, dimmed: the kit never greys a tile.
  const glossy = tone ? tones[tone] : color ? toneFrom(color) : tones.green;
  const radius = shape === 'circle' ? face / 2 : Math.round(face * 0.24);
  const lip = face >= 56 ? 5 : 4;
  const label = [
    accessibilityLabel,
    price === undefined ? undefined : `${price} coins`,
    badge === undefined ? undefined : String(badge),
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={[styles.wrap, style]}>
      <PressableScale
        onPress={onPress}
        disabled={disabled}
        translateOnPress={false}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={disabled ? disabledReason : undefined}
        accessibilityState={{ disabled }}
        style={styles.hit}
      >
        {({ pressed }) => (
          <View style={disabled && styles.dimTile}>
            <GlossFace
              tone={glossy}
              pressed={pressed && !disabled}
              lip={lip}
              radius={radius}
              faceStyle={{ width: face, height: face }}
            >
              <View style={disabled && styles.dimIcon}>{icon}</View>
            </GlossFace>
            {price === undefined ? null : (
              <View style={styles.price} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <View style={styles.coin} />
                <Text style={styles.priceText}>{price}</Text>
              </View>
            )}
            {badge === undefined ? null : (
              <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            )}
          </View>
        )}
      </PressableScale>
      {caption ? (
        captionTone === 'light' ? (
          <StrokeText size={12} strokeWidth={1.5} depth={1} stroke={palette.navyDeep} numberOfLines={1}>
            {caption}
          </StrokeText>
        ) : (
          <Text style={styles.captionDark} numberOfLines={1}>
            {caption}
          </Text>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  hit: { alignItems: 'center', justifyContent: 'center' },
  dimIcon: { opacity: 0.7 },
  dimTile: { opacity: 0.6 },
  price: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.creamFill,
    borderWidth: 1.5,
    borderColor: palette.goldEdge,
  },
  coin: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: palette.gold,
    borderWidth: 1.5,
    borderColor: palette.goldDeep,
  },
  priceText: { fontFamily: font.black, fontSize: 12, lineHeight: 15, color: palette.ink },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: palette.red,
    borderWidth: 2,
    borderColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: font.black, fontSize: labelFloorPx, lineHeight: 14, color: palette.white },
  captionDark: { fontFamily: font.heavy, fontSize: 12, lineHeight: 15, color: palette.ink, textAlign: 'center' },
});
