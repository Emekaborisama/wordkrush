import type { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityRole,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { elevation, gloss as glossToken, radius, shadow, space, withAlpha } from '../theme';
import { PressableScale } from './PressableScale';

type Props = {
  children: ReactNode;
  /** Depth, back to front. 1–3 are cream boxes, lighter as they come forward. */
  level?: 0 | 1 | 2 | 3;
  /** `cream` (default; `paper` is its old name) or the cyan board `frame` (`wood`). */
  variant?: 'cream' | 'frame' | 'paper' | 'wood';
  /** Soft white sheen on the top half of the face. */
  gloss?: boolean;
  /** Override the border colour — e.g. gold on the selected row. */
  borderColor?: string;
  radius?: number;
  padded?: boolean;
  raised?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  'aria-checked'?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Generic raised box on the kit's tokens. New layouts should reach for
 * `CreamBox` / `Panel`; this stays for rows and cards that need `onPress`.
 */
export function Surface({
  children,
  level = 2,
  variant = 'cream',
  gloss: showGloss = false,
  borderColor,
  radius: r = radius.md,
  padded = true,
  raised = false,
  onPress,
  disabled,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  'aria-checked': ariaChecked,
  style,
}: Props) {
  const depth = elevation(level, variant);
  const box: StyleProp<ViewStyle> = [
    {
      backgroundColor: depth.backgroundColor,
      borderRadius: r,
      borderWidth: 2,
      borderColor: borderColor ?? depth.borderColor,
      borderBottomColor: borderColor ?? depth.borderTopColor,
    },
    padded && { padding: space.md },
    raised && shadow.card,
    showGloss && styles.clip,
    style,
  ];
  const resolvedAccessibilityState =
    disabled === undefined ? accessibilityState : { ...accessibilityState, disabled };

  const sheen = showGloss ? (
    <View
      pointerEvents="none"
      style={[styles.gloss, { height: `${glossToken.height * 100}%`, borderTopLeftRadius: r, borderTopRightRadius: r }]}
    />
  ) : null;

  if (!onPress) {
    return (
      <View
        style={box}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={resolvedAccessibilityState}
        aria-checked={ariaChecked}
      >
        {sheen}
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
      accessibilityState={resolvedAccessibilityState}
      aria-checked={ariaChecked}
      style={[box, disabled && styles.disabled]}
    >
      {sheen}
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
  clip: { overflow: 'hidden' },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: withAlpha('#FFFFFF', glossToken.alpha),
  },
});
