import type { AnalyticsEventName, AnalyticsEvents } from './events';

type AnalyticsSink = <K extends AnalyticsEventName>(
  event: K,
  properties: AnalyticsEvents[K],
) => void;

let sink: AnalyticsSink = () => undefined;

export function configureAnalyticsSink(next: AnalyticsSink): void {
  sink = next;
}

export function captureRuntimeAnalytics<K extends AnalyticsEventName>(
  event: K,
  properties: AnalyticsEvents[K],
): void {
  sink(event, properties);
}
