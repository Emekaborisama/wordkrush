import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { tone as tones, toneForPill, toneFrom, type GlossTone, type PillTone, type Tone } from '../theme';
import { GlossFace } from './GlossFace';
import { PressableScale } from './PressableScale';
import { StrokeText } from './StrokeText';

type Variant = 'primary' | 'outline' | 'tonal' | 'ghost';
type Size = 'xl' | 'lg' | 'md' | 'sm';

export type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  /**
   * Kit tone. `green` is the primary CTA (Play, Continue), `gold` the hero
   * Play, `blue` secondary (Connect), `red` destructive / Less, `purple`,
   * `teal`, `coral`, `sky`. Legacy pill names (`ribbon`) still map.
   */
  tone?: Tone | PillTone;
  /** Any hex, for a face whose colour is data (a game accent). `tone` wins. */
  color?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  leading?: ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

const SIZE = {
  xl: { height: 64, radius: 20, lip: 7, font: 30, stroke: 3, depth: 2, padX: 30 },
  lg: { height: 56, radius: 18, lip: 6, font: 25, stroke: 2.5, depth: 2, padX: 26 },
  md: { height: 48, radius: 16, lip: 5, font: 20, stroke: 2, depth: 1.5, padX: 20 },
  sm: { height: 40, radius: 13, lip: 4, font: 16, stroke: 1.5, depth: 1, padX: 14 },
} as const;

function isTone(name: Tone | PillTone): name is Tone {
  return name in tones;
}

function resolveTone(name: Tone | PillTone | undefined, color: string | undefined, variant: Variant): GlossTone {
  if (variant === 'outline' || variant === 'tonal') return tones.sky;
  if (name) return isTone(name) ? tones[name] : tones[toneForPill(name)];
  if (color) return toneFrom(color);
  return tones.green;
}

/**
 * The kit's glossy rounded-rectangle button: gradient face, shine, dark
 * outline, lip that the face sinks onto when pressed, and a white label
 * outlined in the tone's darkest shade (which is what keeps it legible on
 * the pale top of a gold or blue face).
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  tone,
  color,
  disabled,
  fullWidth,
  leading,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ButtonProps) {
  const sizing = SIZE[size];
  const face = disabled ? tones.grey : resolveTone(tone, color, variant);

  if (variant === 'ghost') {
    return (
      <PressableScale
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: Boolean(disabled) }}
        style={[styles.ghost, { minHeight: sizing.height }, disabled && styles.dim, style]}
      >
        <View style={styles.row}>
          {leading ? <View style={styles.leading}>{leading}</View> : null}
          <StrokeText size={Math.round(sizing.font * 0.8)} stroke={face.outline} strokeWidth={sizing.stroke} depth={0}>
            {title}
          </StrokeText>
        </View>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      translateOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={[fullWidth === false ? undefined : styles.fullWidth, style]}
    >
      {({ pressed }) => (
        <GlossFace
          tone={face}
          pressed={pressed && !disabled}
          lip={sizing.lip}
          radius={sizing.radius}
          outline={size === 'sm' ? 1.5 : 2}
          faceStyle={{ minHeight: sizing.height, paddingHorizontal: sizing.padX }}
        >
          <View style={styles.row}>
            {leading ? <View style={styles.leading}>{leading}</View> : null}
            <StrokeText
              size={sizing.font}
              stroke={face.outline}
              strokeWidth={sizing.stroke}
              depth={sizing.depth}
              numberOfLines={1}
            >
              {title}
            </StrokeText>
          </View>
        </GlossFace>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fullWidth: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  leading: { marginRight: 8 },
  ghost: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  dim: { opacity: 0.5 },
});
