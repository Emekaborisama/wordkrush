import { Platform } from 'react-native';
import { captureAnalytics, flushAnalytics } from './client';
import type { AnalyticsEvents } from './events';
import { createReportBudget, toWebVitalsEvent, type VitalsSample } from './vitals';

/** One page view can report this many errors; past that it is one broken loop. */
const errorBudget = createReportBudget(10);

/** Counts an error by where it surfaced. Never sends what it said. */
export function reportAppError(kind: AnalyticsEvents['app_error']['kind'], fatal: boolean): void {
  if (!errorBudget()) return;
  captureAnalytics('app_error', { kind, fatal });
}

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsLike = {
  getGlobalHandler: () => GlobalHandler;
  setGlobalHandler: (handler: GlobalHandler) => void;
};

function isErrorUtils(value: unknown): value is ErrorUtilsLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'getGlobalHandler') === 'function' &&
    typeof Reflect.get(value, 'setGlobalHandler') === 'function'
  );
}

/** An error thrown by our own bundle, not a browser extension or someone else's script. */
function isOurs(filename: string): boolean {
  if (!filename) return true;
  try {
    return new URL(filename).origin === window.location.origin;
  } catch {
    return false;
  }
}

let installed = false;

/**
 * Global error hooks. On web: uncaught errors from our own scripts and
 * unhandled promise rejections. On native: React Native's global handler,
 * chained so the red box and crash behaviour stay exactly as they were.
 * Render errors are reported by `ErrorBoundary`.
 */
export function installErrorReporting(): void {
  if (installed) return;
  installed = true;
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    window.addEventListener('error', (event) => {
      if (isOurs(event.filename)) reportAppError('uncaught', false);
    });
    window.addEventListener('unhandledrejection', (event) => {
      // A browser refusing or interrupting media playback (autoplay rules, a
      // track switch) rejects `play()` inside expo-audio. That is expected,
      // not a crash; its name is read here and never sent.
      const name: unknown = event.reason instanceof Error ? event.reason.name : undefined;
      if (name === 'NotAllowedError' || name === 'AbortError') return;
      reportAppError('unhandled_rejection', false);
    });
    return;
  }
  const errorUtils: unknown = Reflect.get(globalThis, 'ErrorUtils');
  if (!isErrorUtils(errorUtils)) return;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    reportAppError('uncaught', Boolean(isFatal));
    if (isFatal) void flushAnalytics();
    previous(error, isFatal);
  });
}

/**
 * Core Web Vitals for one page view, sent once when the tab is hidden:
 * largest contentful paint, the slowest interaction (an INP stand-in without
 * a library), cumulative layout shift and time to first byte. Browsers
 * without an entry type simply leave that reading out.
 */
export function installWebVitals(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;
  const sample: VitalsSample = { cls: 0 };
  const observe = (type: string, onEntry: (entry: PerformanceEntry) => void, extra: object = {}) => {
    try {
      const observer = new PerformanceObserver((list) => list.getEntries().forEach(onEntry));
      observer.observe({ type, buffered: true, ...extra });
    } catch {
      /* this browser does not report that entry type */
    }
  };
  observe('largest-contentful-paint', (entry) => {
    sample.lcp = entry.startTime;
  });
  observe('layout-shift', (entry) => {
    const value: unknown = Reflect.get(entry, 'value');
    if (typeof value === 'number' && Reflect.get(entry, 'hadRecentInput') !== true) sample.cls += value;
  });
  observe(
    'event',
    (entry) => {
      if (entry.duration > (sample.inp ?? 0)) sample.inp = entry.duration;
    },
    { durationThreshold: 40 },
  );
  try {
    const navigation = performance.getEntriesByType('navigation')[0];
    const responseStart: unknown = navigation ? Reflect.get(navigation, 'responseStart') : undefined;
    if (typeof responseStart === 'number') sample.ttfb = responseStart;
  } catch {
    /* no navigation timing */
  }
  let sent = false;
  const send = () => {
    if (sent) return;
    sent = true;
    const event = toWebVitalsEvent(sample);
    if (!event) return;
    captureAnalytics('web_vitals', event);
    void flushAnalytics();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') send();
  });
  window.addEventListener('pagehide', send);
}
