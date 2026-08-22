import { describe, expect, it } from 'vitest';
import {
  deerSlot,
  DEER_CDN_URI,
  isLottieFileUri,
  LOTTIE_CLIPS,
  MASCOT_ASPECT,
  MASCOT_CDN_URI,
  mascotSize,
  type LottieSlot,
} from './sources';

const DEER_SLOTS: LottieSlot[] = [
  'deer-idle',
  'deer-pleased',
  'deer-celebrate',
  'deer-wince',
  'deer-risk',
];

const PENDING_SLOTS: LottieSlot[] = [
  'flame-idle',
  'flame-risk',
  'flame-extend',
  'crush-hit',
  'crush-best',
];

describe('Lottie clip catalog', () => {
  it('points every deer pose at the lottie.host file, not the HTML embed', () => {
    expect(MASCOT_CDN_URI).toBe(DEER_CDN_URI);
    expect(deerSlot('celebrate')).toBe('deer-celebrate');
    for (const slot of DEER_SLOTS) {
      const { cdn } = LOTTIE_CLIPS[slot];
      expect(cdn).toBe(DEER_CDN_URI);
      expect(cdn && isLottieFileUri(cdn)).toBe(true);
    }
  });

  it('keeps flame and burst slots empty until a real file URL is pasted', () => {
    for (const slot of PENDING_SLOTS) {
      expect(LOTTIE_CLIPS[slot].cdn).toBeNull();
    }
  });

  it('rejects the embed URL and non-https hosts', () => {
    expect(
      isLottieFileUri(
        'https://lottie.host/embed/35f01f32-2f23-42a1-b228-6d7b5b86d50a/RrWseXVzN1.lottie',
      ),
    ).toBe(false);
    expect(isLottieFileUri('http://lottie.host/foo.lottie')).toBe(false);
    expect(isLottieFileUri('not-a-url')).toBe(false);
  });

  it('sizes the deer from its 4:3 composition', () => {
    expect(MASCOT_ASPECT).toBeCloseTo(4 / 3);
    expect(mascotSize(54)).toEqual({ width: 72, height: 54 });
  });
});
