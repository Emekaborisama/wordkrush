import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { radius, theme, withAlpha } from '../theme';
import { PressableScale } from './PressableScale';

type Variant = 'primary' | 'outline' | 'tonal';
type Size = 'lg' | 'md';

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
  accessibilityLabel?: string;
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
  accessibilityLabel,
  style,
}: Props) {
  const sizing = size === 'lg' ? styles.lg : styles.md;
  const variantStyle: StyleProp<ViewStyle> =
    variant === 'primary'
      ? { backgroundColor: color }
      : variant === 'tonal'
        ? { backgroundColor: withAlpha(color, 0.14), borderWidth: 1, borderColor: color }
        : { borderWidth: 1, borderColor: theme.border, backgroundColor: 'transparent' };

  const textColor = variant === 'primary' ? theme.bg : variant === 'tonal' ? theme.text : theme.textDim;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      style={[
        styles.base,
        sizing,
        variantStyle,
        fullWidth === false ? undefined : styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'lg' ? styles.textLg : styles.textMd,
          { color: textColor },
        ]}
      >
        {title}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, minHeight: 44 },
  fullWidth: { width: '100%' },
  lg: { paddingVertical: 20, paddingHorizontal: 32, borderRadius: radius.lg },
  md: { paddingVertical: 13, paddingHorizontal: 24 },
  disabled: { opacity: 0.5 },
  text: { fontWeight: '800' },
  textLg: { fontSize: 18, letterSpacing: 2 },
  textMd: { fontSize: 14, letterSpacing: 0.5 },
});
