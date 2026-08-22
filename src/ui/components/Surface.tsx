import type { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { elevation, radius, shadow, space } from '../theme';
import { PressableScale } from './PressableScale';

type Props = {
  children: ReactNode;
  /** Depth, back to front. See docs/DESIGN_SYSTEM.md#elevation. */
  level?: 0 | 1 | 2 | 3;
  /** Override the border colour — e.g. a game's accent when it's the active card. */
  borderColor?: string;
  radius?: number;
  padded?: boolean;
  raised?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  style?: StyleProp<ViewStyle>;
};

/**
 * The one raised-surface shape. Replaces every screen picking its own
 * combination of `theme.card` / `theme.bgElevated`, border colour, and radius
 * by feel — a card is a depth level, not four separate style decisions.
 */
export function Surface({
  children,
  level = 2,
  borderColor,
  radius: r = radius.lg,
  padded = true,
  raised = false,
  onPress,
  disabled,
  accessibilityLabel,
  accessibilityRole,
  style,
}: Props) {
  const depth = elevation(level);
  const box: StyleProp<ViewStyle> = [
    {
      backgroundColor: depth.backgroundColor,
      borderRadius: r,
      borderWidth: 1,
      borderColor: borderColor ?? depth.borderColor,
      borderTopColor: depth.borderTopColor,
    },
    padded && { padding: space.md },
    raised && shadow.card,
    style,
  ];

  if (!onPress) {
    return (
      <View style={box} accessibilityRole={accessibilityRole} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[box, disabled && styles.disabled]}
    >
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
});
