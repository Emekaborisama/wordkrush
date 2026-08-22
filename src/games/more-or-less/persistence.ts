/**
 * Validation for resumed WordCrush comparison runs.
 *
 * A run is worth resuming: losing a streak of 15 because you glanced at the
 * scores is the kind of thing that makes people stop playing.
 */
import type { GameState } from './engine';
import type { Item } from './types';

function isItem(value: unknown): value is Item {
  if (typeof value !== 'object' || value === null) return false;
  const i = value as Record<string, unknown>;
  return (
    typeof i.id === 'string' &&
    typeof i.categoryId === 'string' &&
    typeof i.label === 'string' &&
    typeof i.value === 'number' &&
    Number.isFinite(i.value) &&
    i.value > 0
  );
}

export function isGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    isItem(s.left) &&
    isItem(s.right) &&
    typeof s.streak === 'number' &&
    Number.isInteger(s.streak) &&
    s.streak >= 0 &&
    typeof s.bestStreak === 'number' &&
    typeof s.seed === 'number' &&
    Array.isArray(s.seenIds) &&
    s.seenIds.every((id) => typeof id === 'string') &&
    (s.status === 'playing' || s.status === 'revealed' || s.status === 'over')
  );
}

/**
 * Whether a saved run is still valid against the CURRENT dataset.
 *
 * Content is regenerated between releases, so a resumed run could reference
 * items that no longer exist or whose values have changed — which would let a
 * player answer against numbers the app no longer shows. Safer to drop it.
 */
export function matchesDataset(state: GameState, pool: Item[]): boolean {
  const byId = new Map(pool.map((i) => [i.id, i]));
  const left = byId.get(state.left.id);
  const right = byId.get(state.right.id);
  if (!left || !right) return false;
  return left.value === state.left.value && right.value === state.right.value;
}

/**
 * A finished run must not resume — it was already scored, and reopening it
 * would let the same streak be recorded twice.
 */
export function isResumable(state: GameState): boolean {
  return state.status !== 'over' && state.streak > 0;
}
