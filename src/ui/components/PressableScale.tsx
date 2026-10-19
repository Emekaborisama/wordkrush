import type { ReactNode } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { interaction } from '../theme';
import { useReduceMotion } from '../useReduceMotion';

export type PressVisual = { pressed: boolean };

type Props = Omit<PressableProps, 'children'> & {
  children: ReactNode | ((state: PressVisual) => ReactNode);
  /**
   * Bevel buttons move their own face. Set this false so the wrapper does not
   * add a second translate. Scale on native still runs.
   */
  translateOnPress?: boolean;
};

/**
 * The one pressed-state for controls that are not bevel pills.
 *
 * Scale-on-press only runs on native. A glossy button (`GlossFace`) sinks
 * its face on web and native instead, and opts out of this translate.
 */
export function PressableScale({
  children,
  disabled,
  onPressIn,
  onPressOut,
  style,
  translateOnPress = true,
  ...rest
}: Props) {
  const reduceMotion = useReduceMotion();
  const scalable = Platform.OS !== 'web';

  return (
    <Pressable
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={(state) => {
        const pressed = state.pressed && !disabled;
        const base = typeof style === 'function' ? style(state) : style;
        const transform: StyleProp<ViewStyle> =
          pressed && scalable && !reduceMotion
            ? {
                transform: [
                  ...(translateOnPress ? [{ translateY: interaction.pressedTranslateY }] : []),
                  { scale: interaction.pressedScale },
                ],
              }
            : undefined;
        return [base, pressed && { opacity: interaction.pressedOpacity }, transform];
      }}
      {...rest}
    >
      {(state) => (typeof children === 'function' ? children({ pressed: state.pressed }) : children)}
    </Pressable>
  );
}
