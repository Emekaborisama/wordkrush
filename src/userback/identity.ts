/**
 * Who a piece of feedback came from.
 *
 * Pure by the same rule as the other pure modules (agents.md, "Non-negotiable
 * architecture"): no React, no storage, no network. It takes the player's
 * fields structurally rather than importing `Profile` from `auth/auth.ts`,
 * which would drag the Supabase client into a module whose whole job is
 * reshaping three strings.
 *
 * Naming note: "feedback" is already taken in this repo — `native/feedback.ts`
 * is the *game feel* (sound + haptics). This directory is the *player's*
 * feedback: bug reports and suggestions, sent to Userback. Everything here is
 * named after the vendor so the two never read as the same thing.
 */

/** The shape Userback's `user_data` / `identify()` expect. */
export type UserbackIdentity = {
  id: string;
  info: { name: string; email?: string };
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
 * Guests are deliberately not given a generated id. A stable anonymous id
 * would turn a support widget into a tracking identifier, which is not what
 * the player agreed to (D-022) — anonymous feedback is still perfectly useful,
 * it just arrives without a name attached.
 */
export function toUserbackIdentity(player: SignedInPlayer | null): UserbackIdentity | null {
  if (!player) return null;
  const id = player.id.trim();
  // An id-less profile cannot be identified; sending an empty string would
  // group every such report under one phantom user in the Userback dashboard.
  if (!id) return null;

  const name = player.username.trim();
  const email = player.email?.trim();

  return {
    id,
    info: {
      name: name || 'Player',
      // Omitted rather than sent empty: Userback treats a blank email as a
      // real (unreachable) address and the reply-to on the report breaks.
      ...(email ? { email } : {}),
    },
  };
}

/**
 * Whether the widget already carries this identity.
 *
 * Every field is compared, not just the id: a player who changes their
 * username should have the next report land under the new one.
 */
export function sameUserbackIdentity(
  a: UserbackIdentity | null,
  b: UserbackIdentity | null,
): boolean {
  if (a === null || b === null) return a === b;
  return a.id === b.id && a.info.name === b.info.name && a.info.email === b.info.email;
}
