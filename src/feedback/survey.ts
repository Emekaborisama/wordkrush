/**
 * The PostHog Surveys definition this app posts into.
 *
 * Presentation is API (headless): the drawer opens our own prompt, and this
 * file is the contract for the `survey sent` event. IDs are public survey
 * metadata, not secrets — they ship in the bundle the same way the project
 * token does. Editing the survey in PostHog without updating these IDs would
 * orphan new responses from the question text.
 *
 * Survey: https://eu.posthog.com/project/254887/surveys/01a05390-18e0-0000-4b50-df74aea090b4
 */
export const FEEDBACK_SURVEY_ID = '01a05390-18e0-0000-4b50-df74aea090b4';
export const FEEDBACK_SURVEY_NAME = 'Player feedback';

export const FEEDBACK_KIND_QUESTION_ID = '384bd40f-5a84-4a65-8e64-a1fb3a904c53';
export const FEEDBACK_MESSAGE_QUESTION_ID = '7c56321c-2784-413e-a077-4258b52b404f';

export const FEEDBACK_KIND_QUESTION = "What's this about?";
export const FEEDBACK_MESSAGE_QUESTION = "What's on your mind?";

export const FEEDBACK_KINDS = ['Bug', 'Suggestion', 'Other'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
