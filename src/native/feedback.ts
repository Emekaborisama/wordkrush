/**
 * The one place that decides what a game moment feels and sounds like.
 *
 * Screens name the *moment* (`feedback('levelUp')`) and never the clip or the
 * haptic style. That keeps the mapping retunable in one table instead of spread
 * across three screens, and it keeps the player's sound/vibration switches
 * enforced in one place rather than at every call site.
 *
 * Both channels are fire-and-forget. Nothing here is awaited by callers and
 * nothing here can reject — see `sound.ts` and `haptics.native.ts`.
 */
import { tapCelebrate, tapLight, tapSelect, tapWrong } from './haptics';
import { play, unloadAll, type SoundName } from './sound';
import { DEFAULT_FEEDBACK_SETTINGS, type FeedbackSettings } from '../settings/types';

/**
 * Game moments, not effects. Shared across all three games so Wordfall's
 * "played a valid word" and More or Less's "guessed right" feel like the same
 * app rather than three different ones.
 */
export type FeedbackEvent =
  /** A correct guess or a valid word. The common positive beat. */
  | 'correct'
  /** A wrong guess, or a word the dictionary rejected. */
  | 'wrong'
  /** A letter joining the current trace — frequent, so it stays silent. */
  | 'select'
  /** A Wordfall level cleared. */
  | 'levelUp'
  /** A run won, or a new personal best. The biggest moment in the app. */
  | 'win';

type Effect = {
  readonly sound?: SoundName;
  readonly haptic?: () => Promise<void>;
};

/**
 * The mapping. Retune the game's whole feel from here.
 *
 * `select` is deliberately haptic-only: it can fire a dozen times per word, and
 * any clip at that rate turns into a machine gun. Everything else pairs a sound
 * with a haptic so the two halves reinforce one moment.
 */
const EFFECTS: Record<FeedbackEvent, Effect> = {
  // Light rather than a success notification: this fires constantly, and the
  // full buzz is reserved for the moments that actually end something.
  correct: { sound: 'bonus', haptic: tapLight },
  wrong: { sound: 'wrong', haptic: tapWrong },
  select: { haptic: tapSelect },
  levelUp: { sound: 'nextLevel', haptic: tapCelebrate },
  win: { sound: 'win', haptic: tapCelebrate },
};

/**
 * Mirrors what the player last chose. Module state rather than context because
 * the call sites are effects inside game logic, not renders — threading a hook
 * through `BoardView`'s gesture handler to mute a tick would be a poor trade.
 * `App.tsx` is the single writer, via `applyFeedbackSettings`.
 */
let settings: FeedbackSettings = DEFAULT_FEEDBACK_SETTINGS;

/**
 * Called by `App.tsx` once on load and again on every toggle.
 *
 * Turning sound off releases the decoded players: a muted game should not be
 * holding audio buffers. They rebuild lazily if it is turned back on.
 */
export function applyFeedbackSettings(next: FeedbackSettings): void {
  const wasOn = settings.sound;
  settings = next;
  if (wasOn && !next.sound) unloadAll();
}

/** Test/debug seam — what `feedback()` is currently gating on. */
export function currentFeedbackSettings(): FeedbackSettings {
  return settings;
}

/**
 * Fires the sound and haptic for a game moment, honouring both switches.
 *
 * Safe to call from a reducer's caller, an effect, or a gesture handler; it
 * returns immediately and never throws.
 */
export function feedback(event: FeedbackEvent): void {
  const effect = EFFECTS[event];
  if (settings.sound && effect.sound) void play(effect.sound);
  if (settings.vibration && effect.haptic) void effect.haptic();
}
