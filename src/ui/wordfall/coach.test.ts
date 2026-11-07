import { describe, expect, it } from 'vitest';
import { shouldShowTraceHint } from './coach';

const hidden = {
  seenIntro: true,
  introDismissed: true,
  singleTileReleases: 0,
  adaptiveDismissed: false,
};

describe('shouldShowTraceHint', () => {
  it('shows on the first visit', () => {
    expect(
      shouldShowTraceHint({
        seenIntro: false,
        introDismissed: false,
        singleTileReleases: 0,
        adaptiveDismissed: false,
      }),
    ).toBe(true);
  });

  it('hides after the first-visit coach is dismissed and no short traces have piled up', () => {
    expect(shouldShowTraceHint(hidden)).toBe(false);
    expect(shouldShowTraceHint({ ...hidden, singleTileReleases: 1 })).toBe(false);
  });

  it('shows again after two single-tile releases', () => {
    expect(shouldShowTraceHint({ ...hidden, singleTileReleases: 2 })).toBe(true);
  });

  it('stays hidden once that second coach is dismissed', () => {
    expect(
      shouldShowTraceHint({ ...hidden, singleTileReleases: 2, adaptiveDismissed: true }),
    ).toBe(false);
  });
});
