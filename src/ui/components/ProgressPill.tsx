import type { ReactNode } from 'react';
import { HudPanel } from './HudPanel';

type Props = {
  label: string;
  value: string | number;
  /** Kept so existing call sites compile; the kit HUD is one colour. */
  color?: string;
  icon?: ReactNode;
  urgent?: boolean;
};

/**
 * In-play counter. Now the kit's HUD panel (cream, red tab); kept under its
 * old name so call sites read the same.
 */
export function ProgressPill({ label, value, urgent = false }: Props) {
  const tab = label.charAt(0) + label.slice(1).toLowerCase();
  return <HudPanel label={tab} value={value} urgent={urgent} />;
}
