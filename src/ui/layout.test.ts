import { describe, expect, it } from 'vitest';
import { COMPACT_MAX_HEIGHT, heightClass, isWideLayout, TIGHT_MAX_HEIGHT, WIDE_MIN } from './layout';

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

describe('heightClass', () => {
  it('keeps the full layout on a modern phone and a laptop', () => {
    expect(heightClass(844)).toBe('regular');
    expect(heightClass(COMPACT_MAX_HEIGHT + 1)).toBe('regular');
  });

  it('compacts an iPhone SE-class screen', () => {
    expect(heightClass(667)).toBe('compact');
    expect(heightClass(COMPACT_MAX_HEIGHT)).toBe('compact');
  });

  it('goes tight for an SE inside Safari', () => {
    expect(heightClass(548)).toBe('tight');
    expect(heightClass(TIGHT_MAX_HEIGHT)).toBe('tight');
  });
});
