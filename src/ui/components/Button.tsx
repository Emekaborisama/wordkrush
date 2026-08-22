import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { font, radius, shadow, theme, withAlpha } from '../theme';
import { PressableScale } from './PressableScale';

type Variant = 'primary' | 'outline' | 'tonal' | 'ghost';
type Size = 'lg' | 'md' | 'sm';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  /** Tint for `primary`/`tonal`. Defaults to the app accent; pass a game's
      accent or `theme.danger` for a destructive tonal action. */
  color?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  leading?: ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The three button shapes every screen needed and kept redrawing: a filled
 * CTA (Home's PLAY), a bordered secondary action (Scores' back / Hub's
 * SCORES), and a tinted-outline choice (Game's MORE/LESS, Scores' sign-in).
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  color = theme.accent,
  disabled,
  fullWidth,
  leading,
  accessibilityLabel,
  accessibilityHint,
  style,
}: Props) {
  const sizing = size === 'lg' ? styles.lg : size === 'sm' ? styles.sm : styles.md;
  const variantStyle: StyleProp<ViewStyle> =
    variant === 'primary'
      ? {
          backgroundColor: color,
          borderColor: withAlpha('#FFFFFF', 0.2),
          borderBottomColor: withAlpha(color, 0.52),
          borderBottomWidth: 5,
        }
      : variant === 'tonal'
        ? {
            backgroundColor: withAlpha(color, 0.16),
            borderColor: withAlpha(color, 0.7),
            borderBottomColor: withAlpha(color, 0.36),
            borderBottomWidth: 4,
          }
        : variant === 'outline'
          ? { borderColor: theme.borderStrong, backgroundColor: theme.bgElevated }
          : { borderColor: 'transparent', backgroundColor: 'transparent' };

  const textColor =
    variant === 'primary' ? theme.bg : variant === 'tonal' ? theme.text : theme.textMuted;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={[
        fullWidth === false ? undefined : styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={[styles.face, sizing, variantStyle, variant === 'primary' && shadow.card]}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <Text
          style={[
            styles.text,
            size === 'lg' ? styles.textLg : size === 'sm' ? styles.textSm : styles.textMd,
            { color: textColor },
          ]}
        >
          {title}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fullWidth: { width: '100%' },
  face: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  lg: { minHeight: 62, paddingVertical: 16, paddingHorizontal: 30, borderRadius: radius.lg },
  md: { minHeight: 50, paddingVertical: 12, paddingHorizontal: 22 },
  sm: { minHeight: 44, paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.sm },
  disabled: { opacity: 0.5 },
  leading: { marginRight: 8 },
  text: { fontFamily: font.semibold, fontWeight: '600' },
  textLg: { fontSize: 19, letterSpacing: 0.6 },
  textMd: { fontSize: 15, letterSpacing: 0.3 },
  textSm: { fontSize: 13.5, letterSpacing: 0.25 },
});
