import AsyncStorage from '@react-native-async-storage/async-storage';
import PostHog from 'posthog-react-native';
import { Platform } from 'react-native';
import {
  type AnalyticsConsent,
  type AnalyticsEventName,
  type AnalyticsEvents,
  type AuthStatus,
} from './events';
import { allowlistedCapture, parseAnalyticsConsent, shouldCapture } from './privacy';
import { configureAnalyticsSink } from './runtime';

const CONSENT_KEY = 'wordkrush.analytics-consent.v1';
const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;

export const isAnalyticsConfigured = Boolean(apiKey && host);

let consent: AnalyticsConsent = 'unknown';

const posthog =
  apiKey && host
    ? new PostHog(apiKey, {
        host,
        defaultOptIn: false,
        personProfiles: 'identified_only',
        captureAppLifecycleEvents: false,
        enableSessionReplay: false,
        disableRemoteFeatureFlags: true,
        preloadFeatureFlags: false,
        setDefaultPersonProperties: false,
        capturePushNotificationSubscriptions: false,
        capturePushNotificationOpened: false,
        errorTracking: {
          autocapture: {
            uncaughtExceptions: true,
            unhandledRejections: true,
            console: false,
          },
        },
        before_send: allowlistedCapture,
        customStorage: {
          getItem: (key) => AsyncStorage.getItem(key),
          setItem: (key, value) => AsyncStorage.setItem(key, value),
        },
        customAppProperties: (properties) => ({
          $app_name: properties.$app_name,
          $app_version: properties.$app_version,
          $app_build: properties.$app_build,
          $app_namespace: properties.$app_namespace,
          $os_name: properties.$os_name,
          $os_version: properties.$os_version,
          $device_type: properties.$device_type,
        }),
      })
    : null;

export async function initializeAnalytics(): Promise<AnalyticsConsent> {
  try {
    consent = parseAnalyticsConsent(await AsyncStorage.getItem(CONSENT_KEY));
  } catch {
    consent = 'unknown';
  }

  if (!posthog) return consent;

  await posthog.ready();
  if (consent === 'granted') await posthog.optIn();
  else await posthog.optOut();

  return consent;
}

export async function setAnalyticsConsent(
  next: Exclude<AnalyticsConsent, 'unknown'>,
  surface: 'prompt' | 'settings',
): Promise<void> {
  consent = next;
  try {
    await AsyncStorage.setItem(CONSENT_KEY, next);
  } catch {
    // The in-memory choice still applies for this session. A storage failure
    // must not turn analytics on unexpectedly after restart.
  }

  if (!posthog) return;
  await posthog.ready();

  if (next === 'granted') {
    await posthog.optIn();
    await posthog.capture('analytics_consent_changed', {
      choice: 'opted_in',
      surface,
      platform: Platform.OS,
    });
  } else {
    await posthog.optOut();
  }
}

export function analyticsConsent(): AnalyticsConsent {
  return consent;
}

export function captureAnalytics<K extends AnalyticsEventName>(
  event: K,
  properties: AnalyticsEvents[K],
): void {
  if (!posthog || !shouldCapture(consent, isAnalyticsConfigured)) return;
  void posthog.capture(event, { ...properties, platform: Platform.OS });
}

export function registerAnalyticsContext(authStatus: AuthStatus): void {
  if (!posthog || !shouldCapture(consent, isAnalyticsConfigured)) return;
  void posthog.register({ auth_status: authStatus, platform: Platform.OS });
}

type IdentifiedUser = {
  id: string;
  username: string;
  email: string | null;
};

export function identifyAnalytics(user: IdentifiedUser): void {
  if (!posthog || !shouldCapture(consent, isAnalyticsConfigured)) return;
  void posthog.identify(user.id, {
    username: user.username,
    ...(user.email ? { email: user.email } : {}),
  });
}

export function resetAnalytics(): void {
  if (!posthog) return;
  void posthog.reset();
}

export async function flushAnalytics(): Promise<void> {
  if (!posthog || !shouldCapture(consent, isAnalyticsConfigured)) return;
  await posthog.flush();
}

configureAnalyticsSink(captureAnalytics);
