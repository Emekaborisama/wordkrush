import type { BeforeSendFn } from '@posthog/core';
import { ANALYTICS_EVENT_NAMES, type AnalyticsConsent } from './events';

export function parseAnalyticsConsent(value: string | null): AnalyticsConsent {
  return value === 'granted' || value === 'denied' ? value : 'unknown';
}

export const allowlistedCapture: BeforeSendFn = (capture) =>
  capture &&
  typeof capture.event === 'string' &&
  (ANALYTICS_EVENT_NAMES.has(capture.event) || capture.event === '$exception')
    ? capture
    : null;

export function shouldCapture(
  currentConsent: AnalyticsConsent,
  configured: boolean,
): boolean {
  return configured && currentConsent === 'granted';
}
