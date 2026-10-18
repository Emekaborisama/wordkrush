import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { bevel, font, interaction, labelFloorPx, palette, pill, pillChrome, radius, type PillTone } from '../theme';
import { BevelFace } from './BevelFace';
import { PressableScale } from './PressableScale';

export type RoundIconButtonProps = {
  icon: ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
  /** Drawn size. Never under 44. Default 52. */
  size?: number;
  /** Price or count, drawn on a yellow badge. */
  badge?: string | number;
  disabled?: boolean;
  /** Read when the control is disabled. */
  disabledReason?: string;
  color?: string;
  tone?: PillTone;
  style?: StyleProp<ViewStyle>;
};

/** Round booster bubble. Same bevel and press as `Button`, with an optional badge. */
export function RoundIconButton({
  icon,
  accessibilityLabel,
  onPress,
  size = 52,
  badge,
  disabled = false,
  disabledReason,
  color,
  tone = 'purple',
  style,
}: RoundIconButtonProps) {
  const box = Math.max(interaction.minTouch, size);
  const chrome = tone && !color ? pill[tone] : pillChrome(color ?? pill[tone].face, 'white');
  const lip = size >= 52 ? bevel.md : bevel.sm;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      translateOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={badge === undefined ? accessibilityLabel : `${accessibilityLabel}, ${badge}`}
      accessibilityHint={disabled ? disabledReason : undefined}
      accessibilityState={{ disabled }}
      style={[styles.hit, { minWidth: box, minHeight: box }, disabled && styles.disabled, style]}
    >
      {({ pressed }) => (
        <View>
          <BevelFace
            pressed={pressed && !disabled}
            bevelPx={lip}
            faceColor={chrome.face}
            bevelColor={chrome.bevel}
            radius={box / 2}
            faceStyle={{ width: box, height: box }}
          >
            {icon}
          </BevelFace>
          {badge === undefined ? null : (
            <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no">
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hit: { alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: palette.ribbon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: palette.brown,
    fontFamily: font.bold,
    fontWeight: '700',
    fontSize: labelFloorPx,
    lineHeight: 14,
  },
});
