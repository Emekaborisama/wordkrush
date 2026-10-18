import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  bevel,
  font,
  palette,
  pill,
  pillChrome,
  pillTone,
  radius,
  shade,
  shadow,
  theme,
  withAlpha,
  type PillTone,
} from '../theme';
import { BevelFace } from './BevelFace';
import { PressableScale } from './PressableScale';

type Variant = 'primary' | 'outline' | 'tonal' | 'ghost';
type Size = 'xl' | 'lg' | 'md' | 'sm';

export type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  /**
   * Named reference pill. Wins over `color`. Green, purple, blue, and coral
   * use a white label on a contrast-safe face. `ribbon` stays yellow with a
   * brown label.
   */
  tone?: PillTone;
  /** Tint for `primary`/`tonal` when `tone` is omitted. Defaults to the green CTA. */
  color?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  leading?: ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

const SIZE = {
  xl: { minHeight: 76, paddingVertical: 18, paddingHorizontal: 32, fontSize: 22, letterSpacing: 0.35, bevel: bevel.lg },
  lg: { minHeight: 62, paddingVertical: 16, paddingHorizontal: 30, fontSize: 19, letterSpacing: 0.6, bevel: bevel.lg },
  md: { minHeight: 50, paddingVertical: 12, paddingHorizontal: 22, fontSize: 15, letterSpacing: 0.3, bevel: bevel.md },
  sm: { minHeight: 44, paddingVertical: 10, paddingHorizontal: 16, fontSize: 13.5, letterSpacing: 0.25, bevel: bevel.sm },
} as const;

/**
 * Glossy pill. Primary is the green CTA (white label). The face sits on a
 * darker lip and depresses by that lip on press, on web and native.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  tone,
  color = theme.accent,
  disabled,
  fullWidth,
  leading,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ButtonProps) {
  const sizing = SIZE[size];
  const chrome = resolveChrome(variant, tone, color);
  const bevelPx = variant === 'ghost' ? 0 : sizing.bevel;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      translateOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={[
        fullWidth === false ? undefined : styles.fullWidth,
        variant === 'primary' && shadow.card,
        disabled && styles.disabled,
        style,
      ]}
    >
      {({ pressed }) => (
        <BevelFace
          pressed={pressed && !disabled}
          bevelPx={bevelPx}
          faceColor={chrome.face}
          bevelColor={chrome.bevel}
          radius={radius.pill}
          gloss={chrome.gloss}
          faceStyle={{
            minHeight: sizing.minHeight,
            paddingVertical: sizing.paddingVertical,
            paddingHorizontal: sizing.paddingHorizontal,
          }}
        >
          <View style={styles.row}>
            {leading ? <View style={styles.leading}>{leading}</View> : null}
            <Text
              style={{
                color: chrome.label,
                fontFamily: font.semibold,
                fontWeight: '600',
                fontSize: sizing.fontSize,
                letterSpacing: sizing.letterSpacing,
              }}
            >
              {title}
            </Text>
          </View>
        </BevelFace>
      )}
    </PressableScale>
  );
}

function resolveChrome(variant: Variant, tone: PillTone | undefined, color: string): {
  face: string;
  bevel: string;
  label: string;
  gloss: boolean;
} {
  if (variant === 'ghost') {
    return { face: 'transparent', bevel: 'transparent', label: palette.brown, gloss: false };
  }
  if (variant === 'outline') {
    return {
      face: palette.paper,
      bevel: theme.borderStrong,
      label: palette.brown,
      gloss: true,
    };
  }
  if (variant === 'tonal') {
    const source = tone ? pillTone[tone] : color;
    return {
      face: withAlpha(source, 0.18),
      bevel: shade(source, bevel.shadeAmount),
      label: palette.brown,
      gloss: false,
    };
  }
  if (tone) {
    const named = pill[tone];
    return { ...named, gloss: true };
  }
  const filled = pillChrome(color, 'white');
  return { ...filled, gloss: true };
}

const styles = StyleSheet.create({
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  leading: { marginRight: 8 },
});
