import { boardForContexts, type ScoreBoard } from '../../scores/types';
import type { CluelessAssistanceContext } from './types';

/** Context used by pre-difficulty Clueless scores. */
export const LEGACY_CLUELESS_SCORE_CONTEXT = 'clueless';

export function normalizeCluelessScoreContext(contextId: string): CluelessAssistanceContext | string {
  return contextId === LEGACY_CLUELESS_SCORE_CONTEXT ? 'standard' : contextId;
}

export function boardForCluelessAssistanceContext(
  board: ScoreBoard,
  assistanceContext: CluelessAssistanceContext,
): ScoreBoard {
  const contexts =
    assistanceContext === 'standard'
      ? [assistanceContext, LEGACY_CLUELESS_SCORE_CONTEXT]
      : [assistanceContext];
  return boardForContexts(board, contexts, 'lower');
}
