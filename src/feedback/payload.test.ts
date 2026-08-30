import { describe, expect, it } from 'vitest';
import {
  distinctIdForFeedback,
  isFeedbackKind,
  normalizeFeedbackMessage,
  surveyEventProperties,
} from './payload';
import {
  FEEDBACK_KIND_QUESTION_ID,
  FEEDBACK_MESSAGE_QUESTION_ID,
  FEEDBACK_SURVEY_ID,
} from './survey';

describe('feedback payload', () => {
  it('accepts only the three kind labels the survey defines', () => {
    expect(isFeedbackKind('Bug')).toBe(true);
    expect(isFeedbackKind('Suggestion')).toBe(true);
    expect(isFeedbackKind('Other')).toBe(true);
    expect(isFeedbackKind('bug')).toBe(false);
    expect(isFeedbackKind('')).toBe(false);
  });

  it('drops whitespace-only messages', () => {
    expect(normalizeFeedbackMessage('   ')).toBeNull();
    expect(normalizeFeedbackMessage('the board ate my word')).toBe('the board ate my word');
  });

  it('uses the signed-in account id and a one-shot id for guests', () => {
    expect(distinctIdForFeedback({ id: 'u-1', name: 'emeka' }, 'shot')).toBe('u-1');
    expect(distinctIdForFeedback(null, 'shot')).toBe('feedback:shot');
  });

  it('keys survey responses by question id so PostHog can attach them', () => {
    const properties = surveyEventProperties('survey sent', {
      kind: 'Bug',
      message: 'Wordfall froze on level 4',
      identity: { id: 'u-1', name: 'emeka', email: 'e@example.com' },
      platform: 'web',
    });

    expect(properties.$survey_id).toBe(FEEDBACK_SURVEY_ID);
    expect(properties.$survey_response).toBe('Bug');
    expect(properties[`$survey_response_${FEEDBACK_KIND_QUESTION_ID}`]).toBe('Bug');
    expect(properties[`$survey_response_${FEEDBACK_MESSAGE_QUESTION_ID}`]).toBe(
      'Wordfall froze on level 4',
    );
    expect(properties.$survey_completed).toBe(true);
    expect(properties.feedback_username).toBe('emeka');
    expect(properties.feedback_email).toBe('e@example.com');
    expect(properties.platform).toBe('web');
  });

  it('omits response keys on shown/dismissed and contact fields for guests', () => {
    const properties = surveyEventProperties('survey shown', {
      identity: null,
      platform: 'ios',
    });
    expect(properties.$survey_response).toBeUndefined();
    expect(properties.feedback_username).toBeUndefined();
    expect(properties.platform).toBe('ios');
  });
});
