import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { toneForPill, type PillTone, type Tone } from '../theme';
import { SquareButton } from './SquareButton';

export type RoundIconButtonProps = {
  icon: ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
  /** Drawn size. Never under 44. Default 52. */
  size?: number;
  /** Price or count, drawn on a red bubble. */
  badge?: string | number;
  disabled?: boolean;
  /** Read when the control is disabled. */
  disabledReason?: string;
  color?: string;
  tone?: Tone | PillTone;
  style?: StyleProp<ViewStyle>;
};

function asTone(name: Tone | PillTone): Tone {
  return name === 'ribbon' || name === 'coral' ? toneForPill(name) : name;
}

/** Round glossy button — the kit's gold gear. A circle `SquareButton`. */
export function RoundIconButton({
  icon,
  accessibilityLabel,
  onPress,
  size = 52,
  badge,
  disabled = false,
  disabledReason,
  color,
  tone = 'purple',
  style,
}: RoundIconButtonProps) {
  return (
    <SquareButton
      icon={icon}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      size={size}
      shape="circle"
      tone={color ? undefined : asTone(tone)}
      color={color}
      badge={badge}
      disabled={disabled}
      disabledReason={disabledReason}
      style={style}
    />
  );
}
