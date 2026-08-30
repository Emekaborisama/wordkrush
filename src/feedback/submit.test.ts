import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareFeedbackReport, submitFeedback } from './submit';

describe('prepareFeedbackReport', () => {
  it('refuses a blank message before any network call', () => {
    expect(
      prepareFeedbackReport({
        kind: 'Bug',
        message: '  ',
        identity: null,
        platform: 'web',
        oneShotId: 'shot',
      }),
    ).toBeNull();
  });
});

describe('submitFeedback', () => {
  beforeEach(() => {
    vi.stubEnv('EXPO_PUBLIC_POSTHOG_KEY', 'phc_test');
    vi.stubEnv('EXPO_PUBLIC_POSTHOG_HOST', 'https://eu.i.posthog.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('posts survey sent to the capture host and returns false on a blank message', async () => {
    expect(
      await submitFeedback({
        kind: 'Bug',
        message: '',
        identity: null,
        platform: 'web',
        oneShotId: 'shot',
      }),
    ).toBe(false);

    const capture = vi.fn(
      async (_url: string, _init: { method: string; headers: Record<string, string>; body: string }) => ({
        ok: true,
      }),
    );
    const sent = await submitFeedback(
      {
        kind: 'Suggestion',
        message: 'more daily vaults',
        identity: { id: 'u-1', name: 'emeka' },
        platform: 'web',
        oneShotId: 'shot',
      },
      capture,
    );
    expect(sent).toBe(true);
    expect(capture).toHaveBeenCalledTimes(1);
    const [url, init] = capture.mock.calls[0];
    expect(url).toBe('https://eu.i.posthog.com/i/v0/e/');
    const body = JSON.parse(init.body) as {
      event: string;
      distinct_id: string;
      properties: { $survey_response: string };
    };
    expect(body.event).toBe('survey sent');
    expect(body.distinct_id).toBe('u-1');
    expect(body.properties.$survey_response).toBe('Suggestion');
  });
});
