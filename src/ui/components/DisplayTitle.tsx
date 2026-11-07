import { palette, reward } from '../theme';
import { StrokeText } from './StrokeText';

export type DisplayTitleProps = {
  children: string;
  /** Fill. Defaults to the kit's "LEVEL COMPLETED" cream-gold. */
  color?: string;
  accessibilityLabel?: string;
  align?: 'center' | 'left';
  size?: number;
};

/**
 * Celebration headline ("LEVEL COMPLETED", "GAME OVER", "DAY 3"): heavy
 * outlined letters with a thick foot. Not the logo — that is `BlockLogo`.
 */
export function DisplayTitle({
  children,
  color = '#FFF1B0',
  accessibilityLabel,
  align = 'center',
  size = 38,
}: DisplayTitleProps) {
  return (
    <StrokeText
      size={size}
      color={color === reward.gold ? palette.gold : color}
      stroke={palette.redDeep}
      strokeWidth={3}
      depth={3}
      align={align}
      accessibilityRole="header"
      accessibilityLabel={accessibilityLabel ?? children}
    >
      {children}
    </StrokeText>
  );
}
