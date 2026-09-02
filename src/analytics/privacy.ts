import type { BeforeSendFn } from '@posthog/core';
import { ANALYTICS_EVENT_NAMES, type AnalyticsConsent } from './events';

/** SDK identity events required for PostHog person profiles after sign-up. */
export const ANALYTICS_IDENTITY_EVENTS: ReadonlySet<string> = new Set(['$identify', '$pageview']);

export function parseAnalyticsConsent(value: string | null): AnalyticsConsent {
  return value === 'denied' ? 'denied' : 'granted';
}

export const allowlistedCapture: BeforeSendFn = (capture) =>
  capture &&
  typeof capture.event === 'string' &&
  (ANALYTICS_EVENT_NAMES.has(capture.event) ||
    ANALYTICS_IDENTITY_EVENTS.has(capture.event))
    ? capture
    : null;

export function shouldCapture(
  currentConsent: AnalyticsConsent,
  configured: boolean,
): boolean {
  return configured && currentConsent === 'granted';
}
