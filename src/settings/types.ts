/**
 * Player-controlled feedback switches — sound effects, music and vibration.
 *
 * Pure data + pure logic, same shape as `streak/types.ts`: no storage, no
 * React, no platform APIs. `settings/storage.ts` owns the AsyncStorage side
 * and `native/feedback.ts` is the only consumer that acts on these.
 *
 * Both default to on. A player who wants a silent game is one tap away in the
 * drawer, but a game that ships muted reads as broken.
 */

export type FeedbackSettings = {
  /** Play the bundled sound effects (`assets/sounds/`). */
  sound: boolean;
  /** Loop the background music (`assets/music/`). Added in 0.12.0. */
  music: boolean;
  /** Fire haptics on native. Always inert on web — see `native/haptics.ts`. */
  vibration: boolean;
};

export const DEFAULT_FEEDBACK_SETTINGS: FeedbackSettings = {
  sound: true,
  music: true,
  vibration: true,
};

export type FeedbackChannel = keyof FeedbackSettings;

/** Flips one channel, leaving the others untouched. */
export function toggleChannel(
  settings: FeedbackSettings,
  channel: FeedbackChannel,
): FeedbackSettings {
  return { ...settings, [channel]: !settings[channel] };
}

export function isValidFeedbackSettings(value: unknown): value is FeedbackSettings {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return typeof s.sound === 'boolean' && typeof s.vibration === 'boolean' && typeof s.music === 'boolean';
}

/**
 * Parses untrusted JSON from storage. Anything unrecognised falls back to the
 * defaults rather than throwing — a corrupt settings blob must never be able
 * to stop the app from starting.
 */
export function parseFeedbackSettings(raw: string | null): FeedbackSettings {
  if (!raw) return DEFAULT_FEEDBACK_SETTINGS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isValidFeedbackSettings(parsed)) return parsed;
    // Saved before music existed: keep the player's sound and vibration
    // choices and give them the default music.
    if (typeof parsed === 'object' && parsed !== null && !('music' in parsed)) {
      const upgraded: unknown = { ...parsed, music: DEFAULT_FEEDBACK_SETTINGS.music };
      if (isValidFeedbackSettings(upgraded)) return upgraded;
    }
    return DEFAULT_FEEDBACK_SETTINGS;
  } catch {
    return DEFAULT_FEEDBACK_SETTINGS;
  }
}
