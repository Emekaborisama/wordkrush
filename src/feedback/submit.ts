import type { FeedbackIdentity } from './identity';
import {
  distinctIdForFeedback,
  normalizeFeedbackMessage,
  surveyEventProperties,
  type FeedbackReport,
} from './payload';
import type { FeedbackKind } from './survey';

type CaptureFn = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean }>;

const postJson: CaptureFn = (url, init) => fetch(url, init);

function captureConfig(): { apiKey: string; host: string } | null {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;
  if (!apiKey || !host) return null;
  return { apiKey, host };
}

/**
 * Feedback uses the same public project token as analytics, but it is
 * user-initiated support rather than measurement (D-063). The drawer stays
 * offered when PostHog is configured, even if the player declined analytics.
 */
export function isFeedbackConfigured(): boolean {
  return captureConfig() !== null;
}

export type SubmitFeedbackInput = {
  kind: FeedbackKind;
  message: string;
  identity: FeedbackIdentity | null;
  platform: string;
  oneShotId: string;
};

/**
 * Posts one Surveys event straight to the capture endpoint.
 *
 * Bypasses the analytics SDK's opt-out on purpose: a player who declined
 * product analytics can still send a bug report. Guests get a one-shot
 * `distinct_id` so reports are not a tracking identifier.
 */
export async function captureSurveyEvent(
  event: 'survey shown' | 'survey sent' | 'survey dismissed',
  input: Omit<SubmitFeedbackInput, 'kind' | 'message'> & {
    kind?: FeedbackKind;
    message?: string;
  },
  capture: CaptureFn = postJson,
): Promise<boolean> {
  const config = captureConfig();
  if (!config) return false;

  const properties = surveyEventProperties(event, {
    identity: input.identity,
    platform: input.platform,
    kind: input.kind,
    message: input.message,
  });

  try {
    const response = await capture(`${config.host.replace(/\/$/, '')}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: config.apiKey,
        event,
        distinct_id: distinctIdForFeedback(input.identity, input.oneShotId),
        properties,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function prepareFeedbackReport(
  input: SubmitFeedbackInput,
): FeedbackReport | null {
  const message = normalizeFeedbackMessage(input.message);
  if (!message) return null;
  return {
    kind: input.kind,
    message,
    identity: input.identity,
    platform: input.platform,
  };
}

export async function submitFeedback(
  input: SubmitFeedbackInput,
  capture: CaptureFn = postJson,
): Promise<boolean> {
  const report = prepareFeedbackReport(input);
  if (!report) return false;
  return captureSurveyEvent(
    'survey sent',
    { ...input, kind: report.kind, message: report.message },
    capture,
  );
}

export function newFeedbackOneShotId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return `fb-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}
