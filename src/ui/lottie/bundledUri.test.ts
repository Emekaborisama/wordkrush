import { describe, expect, it, vi } from 'vitest';
import { bundledAssetUri } from './bundledUri';

describe('bundledAssetUri', () => {
  it('uses a bundler URL string before calling resolveAssetSource', () => {
    const resolve = vi.fn();
    expect(bundledAssetUri('/assets/assets/lottie/deer.hash.lottie', resolve)).toBe(
      '/assets/assets/lottie/deer.hash.lottie',
    );
    expect(resolve).not.toHaveBeenCalled();
  });

  it('reads { uri } objects the web bundler sometimes emits', () => {
    expect(bundledAssetUri({ uri: '/assets/deer.lottie' })).toBe('/assets/deer.lottie');
  });

  it('ignores a numeric module id stringified by resolveAssetSource', () => {
    expect(bundledAssetUri(17, () => ({ uri: '17' }))).toBeUndefined();
  });

  it('accepts a native file URI from resolveAssetSource', () => {
    expect(bundledAssetUri(17, () => ({ uri: 'file:///app/deer.lottie' }))).toBe(
      'file:///app/deer.lottie',
    );
  });

  it('returns undefined when resolveAssetSource throws', () => {
    expect(
      bundledAssetUri(17, () => {
        throw new Error('not implemented');
      }),
    ).toBeUndefined();
  });
});
