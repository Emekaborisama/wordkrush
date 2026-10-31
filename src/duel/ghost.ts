/**
 * Ghosts: the opponent when no person is around. A ghost is not a recording
 * of a real player and never poses as one. The app labels it a ghost
 * everywhere it appears, and it never counts as a person online.
 *
 * Its whole run is worked out up front from a seed, so it is pure and
 * testable: when each answer lands, how far it gets, and where it misses.
 * It is tuned to the player's own best, so a match stays a real contest.
 */
import { nextInt, nextRandom } from '../games/rng';
import { DUEL_MS, START_PROGRESS, type DuelPlayer, type Progress } from './rules';

const NAMES = ['Fox', 'Owl', 'Panda', 'Tiger', 'Raven', 'Moth', 'Lynx', 'Otter', 'Heron', 'Wolf', 'Gecko', 'Hare'];

/** The pause a real round has after an answer, while the value counts up. */
const REVEAL_MS = 1_250;

/** The streak a ghost tends to reach: near the player's best, never hopeless at the start. */
export function ghostTarget(bestStreak: number): number {
  return Math.max(3, Math.min(14, Math.round(bestStreak * 0.85) + 2));
}

export function ghostPlayer(seed: number): DuelPlayer {
  const [nameIndex] = nextInt(seed, NAMES.length);
  // No flag: a ghost is from nowhere, and a country would make it look like a person.
  return { id: `ghost-${seed}`, name: `Ghost ${NAMES[nameIndex]}`, country: null, ghost: true };
}

/** The ghost's run: one step per answer, in time order, the last one its miss if it missed. */
export function ghostPlan(seed: number, bestStreak: number): Progress[] {
  const target = ghostTarget(bestStreak);
  const steps: Progress[] = [];
  let s = seed;
  let at = 0;
  let streak = 0;
  while (at < DUEL_MS) {
    const [think, afterThink] = nextRandom(s);
    const [roll, afterRoll] = nextRandom(afterThink);
    s = afterRoll;
    // Between 1.6 and 4.4 seconds to answer, as a person takes.
    at += Math.round(1_600 + think * 2_800);
    if (at >= DUEL_MS) break;
    // Sure at the start, shakier past its target.
    const chance = streak < target ? 0.96 : 0.55;
    if (roll >= chance) {
      steps.push({ streak, done: true, atMs: steps[steps.length - 1]?.atMs ?? 0 });
      return steps;
    }
    streak += 1;
    steps.push({ streak, done: false, atMs: at });
    at += REVEAL_MS;
  }
  return steps;
}

/** Where the ghost stands `elapsedMs` into the match. */
export function ghostAt(plan: readonly Progress[], elapsedMs: number): Progress {
  let current = START_PROGRESS;
  for (const step of plan) {
    // A miss lands a thinking-time after the last right answer, not at it.
    const landsAt = step.done ? step.atMs + 2_500 : step.atMs;
    if (landsAt > elapsedMs) break;
    current = step;
  }
  return current;
}
