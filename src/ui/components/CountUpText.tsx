import { Text, type StyleProp, type TextStyle } from 'react-native';
import { formatValue, motion } from '../theme';
import { useCountUp } from '../useCountUp';

export type CountUpTextProps = {
  value: number;
  durationMs?: number;
  enabled?: boolean;
  format?: (n: number) => string;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  /** Polite live region. Off by default so a resting counter does not chatter. */
  announce?: boolean;
};

/** Renders `useCountUp` as text. Counts from 0 to `value`. */
export function CountUpText({
  value,
  durationMs = motion.countXpMs,
  enabled = true,
  format = formatValue,
  style,
  accessibilityLabel,
  announce = false,
}: CountUpTextProps) {
  const count = useCountUp(value, durationMs, enabled);
  return (
    <Text
      style={style}
      accessibilityLabel={accessibilityLabel ?? format(value)}
      accessibilityLiveRegion={announce ? 'polite' : undefined}
    >
      {format(count.value)}
    </Text>
  );
}
