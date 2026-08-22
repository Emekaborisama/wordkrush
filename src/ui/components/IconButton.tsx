import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { interaction, radius, theme, withAlpha } from '../theme';
import { PressableScale } from './PressableScale';

type Props = {
  icon: ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
  color?: string;
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  color = theme.textMuted,
  selected = false,
  disabled = false,
  style,
}: Props) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      hitSlop={6}
      style={[styles.hit, disabled && styles.disabled, style]}
    >
      <View
        style={[
          styles.face,
          {
            borderColor: selected ? withAlpha(color, 0.7) : theme.border,
            backgroundColor: selected ? withAlpha(color, 0.16) : theme.bgElevated,
          },
        ]}
      >
        {icon}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: interaction.minTouch,
    minHeight: interaction.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
});
