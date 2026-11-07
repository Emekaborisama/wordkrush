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

  it('tells the launch-week channels apart as social', () => {
    const cases: Array<[string, string]> = [
      ['hackernews', 'hackernews'],
      ['HN', 'hackernews'],
      ['linkedin', 'linkedin'],
      ['whatsapp', 'whatsapp'],
      ['slack', 'slack'],
    ];
    for (const [raw, bucket] of cases) {
      expect(
        resolveAttribution({
          href: `https://wordkrush.com/?utm_source=${raw}&utm_medium=social&utm_campaign=launch_x`,
        }),
      ).toEqual({
        entry_source: 'social',
        has_utm_campaign: true,
        utm_source: bucket,
        utm_medium: 'social',
      });
    }
  });

  it('classifies untagged Hacker News and LinkedIn referrers as social', () => {
    for (const referrer of ['https://news.ycombinator.com/item?id=1', 'https://www.linkedin.com/feed/', 'https://lnkd.in/abc']) {
      expect(resolveAttribution({ href: 'https://wordkrush.com/', referrer })).toEqual({
        entry_source: 'social',
        has_utm_campaign: false,
      });
    }
  });

  it('files utm_medium=organic under search, so launch posts must say social', () => {
    expect(
      resolveAttribution({ href: 'https://wordkrush.com/?utm_source=reddit&utm_medium=organic' }).entry_source,
    ).toBe('search');
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
