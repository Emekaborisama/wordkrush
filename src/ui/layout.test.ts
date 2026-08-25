import { describe, expect, it } from 'vitest';
import { isWideLayout, WIDE_MIN } from './layout';

describe('isWideLayout', () => {
  it('treats a phone width as compact', () => {
    expect(isWideLayout(390)).toBe(false);
    expect(isWideLayout(WIDE_MIN - 1)).toBe(false);
  });

  it('treats a laptop width as wide', () => {
    expect(isWideLayout(WIDE_MIN)).toBe(true);
    expect(isWideLayout(1280)).toBe(true);
  });
});
