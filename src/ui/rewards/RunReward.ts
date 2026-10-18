import type { RewardEvent } from '../../rewards/types';

/** What a finished run hands the result screen. */
export type RunReward = {
  events: RewardEvent[];
  isNewBest: boolean;
  boosted: boolean;
};
