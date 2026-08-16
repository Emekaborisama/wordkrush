import { useEffect, useRef, useState } from 'react';

export type CountUp = {
  value: number;
  /** True once the number has landed — the cue for the sparkle burst. */
  done: boolean;
};

/**
 * Animates 0 -> target for the reveal. This is the emotional beat of the whole
 * game (BRAINSTORM §2 step 4), so it gets a real easing curve rather than a
 * linear ramp: fast at first, slowing as it lands, which reads as the number
 * "settling" on its answer.
 *
 * Uses requestAnimationFrame, which react-native-web maps to the browser's and
 * React Native provides natively — so this works on both targets unchanged.
 */
export function useCountUp(target: number, durationMs = 900, enabled = true): CountUp {
  const [state, setState] = useState<CountUp>(
    enabled ? { value: 0, done: false } : { value: target, done: true },
  );
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState({ value: target, done: true });
      return;
    }
    const start = Date.now();
    setState({ value: 0, done: false });

    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      if (t < 1) {
        setState({ value: target * eased, done: false });
        frame.current = requestAnimationFrame(tick);
      } else {
        // Land exactly on the target — easing can leave a fractional gap.
        setState({ value: target, done: true });
      }
    };
    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target, durationMs, enabled]);

  return state;
}
