import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * One reduce-motion subscription for the app. Rays, confetti, pops, and the
 * button spring all read this instead of each keeping their own listener.
 *
 * Starts `false` and updates when the OS answers, matching the previous
 * PressableScale and Mascot behaviour.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) setReduceMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
