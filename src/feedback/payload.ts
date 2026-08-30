import type { FeedbackIdentity } from './identity';
import {
  FEEDBACK_KIND_QUESTION,
  FEEDBACK_KIND_QUESTION_ID,
  FEEDBACK_KINDS,
  FEEDBACK_MESSAGE_QUESTION,
  FEEDBACK_MESSAGE_QUESTION_ID,
  FEEDBACK_SURVEY_ID,
  FEEDBACK_SURVEY_NAME,
  type FeedbackKind,
} from './survey';

export type FeedbackReport = {
  kind: FeedbackKind;
  message: string;
  identity: FeedbackIdentity | null;
  platform: string;
};

export type SurveyCaptureEvent = 'survey shown' | 'survey sent' | 'survey dismissed';

const KIND_SET = new Set<string>(FEEDBACK_KINDS);

export function isFeedbackKind(value: string): value is FeedbackKind {
  return KIND_SET.has(value);
}

/** Empty or whitespace-only reports are not sent. */
export function normalizeFeedbackMessage(message: string): string | null {
  const trimmed = message.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function distinctIdForFeedback(identity: FeedbackIdentity | null, oneShotId: string): string {
  return identity?.id ?? `feedback:${oneShotId}`;
}

/**
 * Properties PostHog Surveys expects on `survey sent` (and the shown/dismissed
 * siblings). Question responses are keyed by `$survey_response_<question id>`.
 */
export function surveyEventProperties(
  event: SurveyCaptureEvent,
  report: Pick<FeedbackReport, 'identity' | 'platform'> & {
    kind?: FeedbackKind;
    message?: string;
  },
): Record<string, string | boolean | { id: string; question: string }[]> {
  const properties: Record<string, string | boolean | { id: string; question: string }[]> = {
    $survey_id: FEEDBACK_SURVEY_ID,
    $survey_name: FEEDBACK_SURVEY_NAME,
    $survey_questions: [
      { id: FEEDBACK_KIND_QUESTION_ID, question: FEEDBACK_KIND_QUESTION },
      { id: FEEDBACK_MESSAGE_QUESTION_ID, question: FEEDBACK_MESSAGE_QUESTION },
    ],
    platform: report.platform,
  };

  if (event === 'survey sent' && report.kind && report.message) {
    properties.$survey_response = report.kind;
    properties[`$survey_response_${FEEDBACK_KIND_QUESTION_ID}`] = report.kind;
    properties[`$survey_response_${FEEDBACK_MESSAGE_QUESTION_ID}`] = report.message;
    properties.$survey_completed = true;
  }

  if (report.identity) {
    properties.feedback_username = report.identity.name;
    if (report.identity.email) properties.feedback_email = report.identity.email;
  }

  return properties;
}
