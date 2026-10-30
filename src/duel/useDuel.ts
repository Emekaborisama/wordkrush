import { useEffect, useRef, useState } from 'react';
import { DuelController, type DuelState } from './controller';
import type { DuelPlayer } from './rules';
import { realtimeDuelTransport } from './transport';

/** One controller per screen, its state as React state, and a clean exit on unmount. */
export function useDuel(me: DuelPlayer, bestStreak: number) {
  const [state, setState] = useState<DuelState>({ phase: 'idle' });
  const ref = useRef<DuelController | null>(null);
  if (!ref.current) {
    ref.current = new DuelController({ me, bestStreak, transport: realtimeDuelTransport, onChange: setState });
  }
  const controller = ref.current;
  useEffect(() => () => controller.leave(), [controller]);
  return { state, controller };
}
