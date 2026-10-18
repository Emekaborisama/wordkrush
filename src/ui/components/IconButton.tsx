import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { SquareButton } from './SquareButton';

type Props = {
  icon: ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
  /** Kept so existing call sites compile; small icon buttons are sky squares. */
  color?: string;
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** 44pt icon hit as a small kit square (gold when selected). */
export function IconButton({ icon, accessibilityLabel, onPress, selected = false, disabled = false, style }: Props) {
  return (
    <SquareButton
      icon={icon}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      tone={selected ? 'gold' : 'sky'}
      size={44}
      disabled={disabled}
      style={style}
    />
  );
}
