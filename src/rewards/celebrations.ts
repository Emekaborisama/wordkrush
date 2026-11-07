/**
 * A finished run's level-up and milestone moments, as the short labels the
 * result panel shows in one row. They used to open a second pop-up over the
 * result, one per moment, which the player had to dismiss before seeing how
 * the run went (UX review 2026-11-07). Pure: no React, no platform.
 *
 * "Level" on its own always means a game's stage (Clueless 1/29, Wordfall
 * level 2), so the player's XP level is always "Player level" here.
 */
import type { MilestoneId, RewardEvent } from './types';

const MILESTONE_LABEL: Readonly<Record<MilestoneId, string>> = {
  'flame-3': '3-day flame',
  'flame-7': '7-day flame',
  'flame-14': '14-day flame',
  'flame-30': '30-day flame',
  // One-time milestones: the run may have gone further than the number.
  'mol-streak-5': 'First streak of 5',
  'mol-streak-10': 'First streak of 10',
  'mol-streak-20': 'First streak of 20',
  'mol-set-1': 'Set cleared',
  'clueless-sparks': 'Sparks cleared',
  'clueless-vault-1': 'First vault',
  'clueless-vault-7': 'Seven vaults',
  'wordfall-campaign': 'Campaign clear',
  'wordfall-weekly-1': 'Weekly clear',
  'level-5': 'Player level 5',
  'level-10': 'Player level 10',
};

/** The label for one milestone. */
export function milestoneLabel(id: MilestoneId): string {
  return MILESTONE_LABEL[id];
}

/**
 * Labels for the run's level-ups and milestones, in event order, each once.
 * A player-level milestone (`level-5`, `level-10`) is left out when the run
 * also levelled up: the level-up already says it.
 */
export function celebrationLabels(events: readonly RewardEvent[]): string[] {
  const levelledUp = events.some((event) => event.kind === 'levelUp');
  const labels: string[] = [];
  for (const event of events) {
    let label: string | null = null;
    if (event.kind === 'levelUp') label = `Player level ${event.to}`;
    else if (event.kind === 'milestone' && !(levelledUp && event.id.startsWith('level-'))) {
      label = milestoneLabel(event.id);
    }
    if (label !== null && !labels.includes(label)) labels.push(label);
  }
  return labels;
}
