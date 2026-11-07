import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_EVENT_NAMES,
  authErrorCategory,
  chainLengthBucket,
  levelBucket,
  rankBucket,
  runCountBucket,
  scoreDeltaBucket,
  streakBucket,
  wordLengthBucket,
  type AnalyticsEvents,
} from './events';
import { allowlistedCapture, parseAnalyticsConsent, shouldCapture } from './privacy';
import { captureRuntimeAnalytics, configureAnalyticsSink } from './runtime';

describe('analytics privacy boundary', () => {
  it('defaults missing or malformed consent to granted (default on)', () => {
    expect(parseAnalyticsConsent(null)).toBe('granted');
    expect(parseAnalyticsConsent('yes')).toBe('granted');
    expect(parseAnalyticsConsent('denied')).toBe('denied');
  });

  it('captures only when configured and not explicitly denied (opt-out)', () => {
    expect(shouldCapture('denied', true)).toBe(false);
    expect(shouldCapture('granted', false)).toBe(false);
    expect(shouldCapture('granted', true)).toBe(true);
  });

  it('drops events outside the documented event dictionary, but allows $pageview', () => {
    expect(allowlistedCapture({ event: 'run_completed' })).toEqual({
      event: 'run_completed',
    });
    expect(allowlistedCapture({ event: '$identify' })).toEqual({
      event: '$identify',
    });
    expect(allowlistedCapture({ event: '$pageview' })).toEqual({
      event: '$pageview',
    });
    expect(allowlistedCapture({ event: '$autocapture' })).toBeNull();
    expect(allowlistedCapture({ event: '$exception' })).toBeNull();
  });

  it('keeps shared runtime boundaries no-op until the SDK configures a sink', () => {
    expect(() =>
      captureRuntimeAnalytics('score_persist_failed', {
        game_id: 'wordfall',
        operation: 'save',
        error_category: 'storage',
      }),
    ).not.toThrow();

    const received: string[] = [];
    configureAnalyticsSink((event) => received.push(event));
    captureRuntimeAnalytics('signed_out', {});
    expect(received).toEqual(['signed_out']);
    configureAnalyticsSink(() => undefined);
  });
});

describe('analytics property buckets', () => {
  it('keeps numeric dimensions bounded', () => {
    expect(streakBucket(20)).toBe('20_plus');
    expect(runCountBucket(3)).toBe('3_9');
    expect(rankBucket(null)).toBe('unranked');
    expect(rankBucket(1)).toBe('win');
    expect(wordLengthBucket(8)).toBe('8_plus');
    expect(scoreDeltaBucket(150)).toBe('150_plus');
    expect(chainLengthBucket(2)).toBe('2_3');
  });

  it('maps auth copy to a bounded error category', () => {
    expect(authErrorCategory('Network request failed')).toBe('network');
    expect(authErrorCategory('Too many requests')).toBe('rate_limit');
    expect(authErrorCategory('Email not confirmed')).toBe('unconfirmed');
    expect(authErrorCategory('Invalid password')).toBe('credentials');
    expect(authErrorCategory('That username is taken. Try another.')).toBe('credentials');
    expect(authErrorCategory('Unexpected response')).toBe('other');
  });
});

describe('reward events', () => {
  it('names boosts, chests, levels, and milestones without free text', () => {
    const boost: AnalyticsEvents['boost_used'] = { game_id: 'wordfall', boost_kind: 'shuffle' };
    const chest: AnalyticsEvents['daily_chest_claimed'] = { chest_day: 3 };
    const level: AnalyticsEvents['player_level_up'] = { level_bucket: '5_9' };
    const milestone: AnalyticsEvents['milestone_reached'] = { milestone_id: 'flame-3' };
    const completed: AnalyticsEvents['run_completed'] = {
      game_id: 'clueless',
      outcome: 'win',
      score: 12,
      score_kind: 'guesses_used',
      is_new_best: true,
      boosted: true,
    };

    expect(ANALYTICS_EVENT_NAMES.has('boost_used')).toBe(true);
    expect(ANALYTICS_EVENT_NAMES.has('daily_chest_claimed')).toBe(true);
    expect(ANALYTICS_EVENT_NAMES.has('player_level_up')).toBe(true);
    expect(ANALYTICS_EVENT_NAMES.has('milestone_reached')).toBe(true);
    expect(allowlistedCapture({ event: 'boost_used', properties: boost })?.event).toBe('boost_used');
    expect(allowlistedCapture({ event: 'daily_chest_claimed', properties: chest })?.event).toBe(
      'daily_chest_claimed',
    );
    expect(level.level_bucket).toBe(levelBucket(6));
    expect(milestone.milestone_id).toBe('flame-3');
    expect(completed.boosted).toBe(true);
    expect(levelBucket(1)).toBe('1_4');
    expect(levelBucket(10)).toBe('10_19');
    expect(levelBucket(20)).toBe('20_plus');
  });
});
