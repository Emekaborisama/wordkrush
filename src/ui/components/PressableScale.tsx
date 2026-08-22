import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { interaction } from '../theme';

type Props = PressableProps & {
  children: React.ReactNode;
};

/**
 * The one pressed-state for the app. Every screen used to redefine
 * `pressed && styles.pressed` with a slightly different opacity (0.6, 0.7,
 * 0.75, 0.85 all appeared across screens) — this is the single decision.
 *
 * Scale-on-press only runs on native. On web a mouse cursor is still visibly
 * hovering while the element shrinks underneath it, which reads as jank
 * rather than tactility, so the web build stays opacity-only.
 */
export function PressableScale({ children, disabled, onPressIn, onPressOut, style, ...rest }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const scalable = Platform.OS !== 'web';

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  return (
    <Pressable
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        state.pressed && !disabled && { opacity: interaction.pressedOpacity },
        state.pressed && scalable && !reduceMotion && styles.pressed,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    transform: [
      { translateY: interaction.pressedTranslateY },
      { scale: interaction.pressedScale },
    ],
  },
});
