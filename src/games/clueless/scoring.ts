import { boardForContexts, type ScoreBoard } from '../../scores/types';
import type { CluelessDifficulty } from './types';

/** Context used by pre-difficulty Clueless scores. */
export const LEGACY_CLUELESS_SCORE_CONTEXT = 'clueless';

export function normalizeCluelessScoreContext(contextId: string): CluelessDifficulty | string {
  return contextId === LEGACY_CLUELESS_SCORE_CONTEXT ? 'standard' : contextId;
}

export function boardForCluelessDifficulty(
  board: ScoreBoard,
  difficulty: CluelessDifficulty,
): ScoreBoard {
  const contexts =
    difficulty === 'standard'
      ? [difficulty, LEGACY_CLUELESS_SCORE_CONTEXT]
      : [difficulty];
  return boardForContexts(board, contexts, 'lower');
}
