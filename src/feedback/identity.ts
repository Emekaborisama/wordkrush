/**
 * Who a piece of feedback came from.
 *
 * Pure by the same rule as the other pure modules (agents.md, "Non-negotiable
 * architecture"): no React, no storage, no network. It takes the player's
 * fields structurally rather than importing `Profile` from `auth/auth.ts`.
 *
 * Naming note: "feedback" is already taken in this repo — `native/feedback.ts`
 * is the *game feel* (sound + haptics). This directory is the *player's*
 * feedback: bug reports and suggestions, sent to PostHog Surveys.
 */

export type FeedbackIdentity = {
  id: string;
  name: string;
  email?: string;
};

/**
 * Structural stand-in for `auth/auth.ts`'s `Profile`. Kept local so this file
 * imports nothing; the compiler still fails if `Profile` drifts, because
 * App.tsx passes a real one in.
 */
export type SignedInPlayer = {
  id: string;
  username: string;
  email: string | null;
};

/**
 * A signed-in player becomes an identity; a guest becomes `null`.
 *
 * Guests are deliberately not given a generated id here. A stable anonymous id
 * would turn a support form into a tracking identifier, which is not what the
 * player agreed to (D-022) — anonymous feedback is still perfectly useful,
 * it just arrives without a name attached. The submit path mints a one-shot
 * id per report so PostHog has a `distinct_id` without linking reports.
 */
export function toFeedbackIdentity(player: SignedInPlayer | null): FeedbackIdentity | null {
  if (!player) return null;
  const id = player.id.trim();
  // An id-less profile cannot be identified; sending an empty string would
  // group every such report under one phantom user in PostHog.
  if (!id) return null;

  const name = player.username.trim();
  const email = player.email?.trim();

  return {
    id,
    name: name || 'Player',
    // Omitted rather than sent empty: a blank email is not a reachable reply-to.
    ...(email ? { email } : {}),
  };
}
