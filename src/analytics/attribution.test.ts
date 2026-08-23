import { describe, expect, it } from 'vitest';
import { isLandingArrival, resolveAttribution } from './attribution';

describe('resolveAttribution', () => {
  it('treats an empty arrival as direct', () => {
    expect(resolveAttribution({})).toEqual({
      entry_source: 'direct',
      has_utm_campaign: false,
    });
  });

  it('classifies Meta paid UTMs without keeping campaign copy', () => {
    expect(
      resolveAttribution({
        href: 'https://wordkrush.com/?utm_source=facebook&utm_medium=cpc&utm_campaign=Promoting%20WordKrush',
      }),
    ).toEqual({
      entry_source: 'paid',
      has_utm_campaign: true,
      utm_source: 'facebook',
      utm_medium: 'paid',
    });
  });

  it('classifies a search referrer', () => {
    expect(
      resolveAttribution({
        href: 'https://wordkrush.com/',
        referrer: 'https://www.google.com/search?q=wordkrush',
      }),
    ).toEqual({
      entry_source: 'search',
      has_utm_campaign: false,
    });
  });

  it('classifies a Facebook referrer without UTMs as social', () => {
    expect(
      resolveAttribution({
        href: 'https://wordkrush.com/',
        referrer: 'https://l.facebook.com/',
      }).entry_source,
    ).toBe('social');
  });

  it('does not parse UTMs or referrers from auth callbacks', () => {
    expect(
      resolveAttribution({
        href: 'https://wordkrush.com/?utm_source=facebook#access_token=secret&refresh_token=also-secret',
        referrer: 'https://www.google.com/',
      }),
    ).toEqual({
      entry_source: 'auth',
      has_utm_campaign: false,
    });
  });

  it('ignores hash fragments when reading UTMs', () => {
    expect(
      resolveAttribution({
        href: 'https://wordkrush.com/?utm_source=reddit&utm_medium=share#access_token=secret',
      }),
    ).toEqual({
      entry_source: 'share',
      has_utm_campaign: false,
      utm_source: 'reddit',
      utm_medium: 'share',
    });
  });

  it('maps unknown UTM tokens to other', () => {
    expect(
      resolveAttribution({
        href: 'https://wordkrush.com/?utm_source=newsletter-xyz&utm_medium=push',
      }),
    ).toEqual({
      entry_source: 'other',
      has_utm_campaign: false,
      utm_source: 'other',
      utm_medium: 'other',
    });
  });
});

describe('isLandingArrival', () => {
  it('always counts the web document as a landing', () => {
    expect(
      isLandingArrival({ isWeb: true, hasHref: false, entry_source: 'direct' }),
    ).toBe(true);
  });

  it('counts native deep links that are not auth callbacks', () => {
    expect(
      isLandingArrival({ isWeb: false, hasHref: true, entry_source: 'share' }),
    ).toBe(true);
    expect(
      isLandingArrival({ isWeb: false, hasHref: true, entry_source: 'auth' }),
    ).toBe(false);
    expect(
      isLandingArrival({ isWeb: false, hasHref: false, entry_source: 'direct' }),
    ).toBe(false);
  });
});
