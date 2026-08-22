/**
 * Lottie clip catalog. Chrome only — never imported from a game reducer.
 *
 * Each slot has a lottie.host **file** URL (`cdn`) or `null` until the owner
 * pastes one. Use the file URL, never the `/embed/` HTML player.
 * A bundled fallback keeps a CDN miss from blocking play (D-004, D-032).
 *
 * Deer poses currently share the one hosted deer. Replace a row's `cdn` when
 * a distinct pose exists; do not point flame/burst slots at the deer.
 */

export const DEER_CDN_URI =
  'https://lottie.host/35f01f32-2f23-42a1-b228-6d7b5b86d50a/RrWseXVzN1.lottie';

/** @deprecated Use `DEER_CDN_URI` or `LOTTIE_CLIPS['deer-idle'].cdn`. */
export const MASCOT_CDN_URI = DEER_CDN_URI;

export type DeerPose = 'idle' | 'pleased' | 'celebrate' | 'wince' | 'risk';

export type LottieSlot =
  | `deer-${DeerPose}`
  | 'flame-idle'
  | 'flame-risk'
  | 'flame-extend'
  | 'crush-hit'
  | 'crush-best';

export type LottieClip = {
  /** lottie.host file URL, or null until supplied. */
  cdn: string | null;
  loop: boolean;
};

export const LOTTIE_CLIPS: Record<LottieSlot, LottieClip> = {
  'deer-idle': { cdn: DEER_CDN_URI, loop: true },
  'deer-pleased': { cdn: DEER_CDN_URI, loop: false },
  'deer-celebrate': { cdn: DEER_CDN_URI, loop: false },
  'deer-wince': { cdn: DEER_CDN_URI, loop: false },
  'deer-risk': { cdn: DEER_CDN_URI, loop: true },
  'flame-idle': { cdn: null, loop: true },
  'flame-risk': { cdn: null, loop: true },
  'flame-extend': { cdn: null, loop: false },
  'crush-hit': { cdn: null, loop: false },
  'crush-best': { cdn: null, loop: false },
};

export function deerSlot(pose: DeerPose): LottieSlot {
  return `deer-${pose}`;
}

/** Native composition size of the deer clip (1600×1200). */
export const MASCOT_WIDTH = 1600;
export const MASCOT_HEIGHT = 1200;
export const MASCOT_ASPECT = MASCOT_WIDTH / MASCOT_HEIGHT;

export function mascotSize(height: number): { width: number; height: number } {
  return { width: Math.round(height * MASCOT_ASPECT), height };
}

export function isLottieFileUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'lottie.host' &&
      !url.pathname.includes('/embed/') &&
      url.pathname.endsWith('.lottie')
    );
  } catch {
    return false;
  }
}
