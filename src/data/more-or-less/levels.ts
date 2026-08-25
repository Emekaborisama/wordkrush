/**
 * Bundled More or Less campaign path.
 *
 * Solo Play stays the endless Wikipedia run. This catalog is the numbered
 * team-race path: reach the target streak before death (and, live, before the
 * clock). Optional `band` tightens pairing from the first round instead of
 * waiting for the streak curve.
 */
import type { CampaignLevel } from '../../games/campaign';
import type { RatioBand } from '../../games/more-or-less/pairing';

export type MoreOrLessLevel = CampaignLevel & {
  targetStreak: number;
  band?: RatioBand;
};

export const MORE_OR_LESS_LEVELS: readonly MoreOrLessLevel[] = [
  {
    number: 1,
    name: 'Warm-up',
    description: 'Obvious gaps. Get five in a row.',
    targetStreak: 5,
  },
  {
    number: 2,
    name: 'Stretch',
    description: 'Same curve, a little longer.',
    targetStreak: 8,
  },
  {
    number: 3,
    name: 'Double digits',
    description: 'Hold a streak of ten.',
    targetStreak: 10,
  },
  {
    number: 4,
    name: 'Close calls',
    description: 'Pairs start tighter than a fresh run.',
    targetStreak: 8,
    band: { min: 1.5, max: 2.0 },
  },
  {
    number: 5,
    name: 'Twelve',
    description: 'The standard curve, past the first wall.',
    targetStreak: 12,
  },
  {
    number: 6,
    name: 'Fine margins',
    description: 'Near-ties from the first card.',
    targetStreak: 10,
    band: { min: 1.15, max: 1.5 },
  },
  {
    number: 7,
    name: 'Fifteen',
    description: 'A long chain on the usual difficulty ramp.',
    targetStreak: 15,
  },
  {
    number: 8,
    name: 'Precision',
    description: 'Tight pairs, twelve deep.',
    targetStreak: 12,
    band: { min: 1.15, max: 1.5 },
  },
  {
    number: 9,
    name: 'Twenty',
    description: 'Beat a twenty-streak before the clock.',
    targetStreak: 20,
  },
  {
    number: 10,
    name: 'Marathon',
    description: 'The long one. Survive twenty-five.',
    targetStreak: 25,
  },
];

export function moreOrLessLevelByNumber(n: number): MoreOrLessLevel | undefined {
  return MORE_OR_LESS_LEVELS[n - 1];
}
