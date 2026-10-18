import { palette } from '../theme';
import { clampParticleCount } from '../motion';
import { Sparkle, type SparkleShape } from '../Sparkle';

export type ConfettiProps = {
  active: boolean;
  colors?: readonly string[];
  /** Capped at 24. */
  count?: number;
  shape?: SparkleShape;
};

const DEFAULT_COLORS = [palette.star, palette.ribbon, palette.coral, palette.green, palette.purple] as const;

/**
 * A short burst that then falls. Built on `Sparkle` so the particle ceiling
 * stays in one place.
 */
export function Confetti({ active, colors = DEFAULT_COLORS, count = 18, shape = 'rect' }: ConfettiProps) {
  return <Sparkle active={active} colors={colors} count={clampParticleCount(count)} shape={shape} fall />;
}
