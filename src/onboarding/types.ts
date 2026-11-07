/**
 * First-run welcome flag. Pure data + parse — no storage, no React.
 *
 * Default is unseen. A corrupt blob must never crash startup; treat it as
 * unseen so a broken write can still show the welcome rather than skip it.
 */

export type OnboardingState = {
  completed: boolean;
};

export const UNSEEN_ONBOARDING: OnboardingState = { completed: false };

export const COMPLETED_ONBOARDING: OnboardingState = { completed: true };

export function isValidOnboardingState(value: unknown): value is OnboardingState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Record<string, unknown>;
  return typeof state.completed === 'boolean';
}

/**
 * Parses untrusted JSON from storage. Anything unrecognised falls back to
 * unseen — the player may see the welcome again, which is better than
 * silently skipping it after a bad write.
 */
export function parseOnboardingState(raw: string | null): OnboardingState {
  if (!raw) return UNSEEN_ONBOARDING;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidOnboardingState(parsed) ? parsed : UNSEEN_ONBOARDING;
  } catch {
    return UNSEEN_ONBOARDING;
  }
}
