import { describe, expect, it } from 'vitest';
import { parseSplashData } from './api';

const valid = { v: 1, day: 'Sun 23 Aug', left: 'YouTube', right: 'Instagram', metric: 'pageviews' };

describe('parseSplashData', () => {
  it('accepts what the server writes onto the post', () => {
    expect(parseSplashData(valid)).toEqual(valid);
  });

  /**
   * Posts outlive app versions. A post created months ago carries whatever
   * `postData` that release wrote, so the splash has to be able to say "I don't
   * recognise this" and fall back to a fetch rather than render undefined.
   */
  it('rejects a shape written by some other version', () => {
    expect(parseSplashData({ ...valid, v: 2 })).toBeNull();
    expect(parseSplashData({ day: 'Sun 23 Aug' })).toBeNull();
  });

  it('rejects missing, empty, and non-string fields', () => {
    expect(parseSplashData({ ...valid, left: '' })).toBeNull();
    expect(parseSplashData({ ...valid, right: 42 })).toBeNull();
    expect(parseSplashData(undefined)).toBeNull();
    expect(parseSplashData(null)).toBeNull();
    expect(parseSplashData('nope')).toBeNull();
  });
});
