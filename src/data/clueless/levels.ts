import {
  FIRST_DAILY_VAULT_LEVEL,
  type CluelessPathPhase,
} from '../../games/clueless/path';
import type { CluelessHintPolicy, Puzzle } from '../../games/clueless/types';
import { puzzleByNumber } from './index';

type LevelDetails = {
  number: number;
  puzzleNumber: number;
  name: string;
  description: string;
  phase: CluelessPathPhase;
};

type LevelWithHint = LevelDetails & {
  hintPolicy: Exclude<CluelessHintPolicy, 'none'>;
  hint: string;
};

type LevelWithoutHint = LevelDetails & {
  hintPolicy: 'none';
  hint: null;
};

/**
 * The canonical bundled solo path. Puzzle JSON remains generated data, while
 * level names, assistance, and reviewed hint copy remain intentionally
 * editorial metadata here.
 */
export type CluelessSoloLevel = LevelWithHint | LevelWithoutHint;

export const CLUELESS_SOLO_LEVELS: readonly CluelessSoloLevel[] = [
  {
    number: 1,
    puzzleNumber: 31,
    name: 'First Spark',
    description: 'Start with a guiding glow.',
    phase: 'tutorial',
    hintPolicy: 'opening',
    hint: 'Quiet aisles, borrowed stories, and shelves that turn questions into journeys.',
  },
  {
    number: 2,
    puzzleNumber: 32,
    name: 'Follow the Heat',
    description: 'Earn a clue after fifteen solid guesses.',
    phase: 'tutorial',
    hintPolicy: 'guess_threshold',
    hint: 'Questions become evidence through experiments, measurements, and careful testing.',
  },
  {
    number: 3,
    puzzleNumber: 33,
    name: 'No Map',
    description: 'Trust the heat. There is no clue this time.',
    phase: 'tutorial',
    hintPolicy: 'none',
    hint: null,
  },
  {
    number: 4,
    puzzleNumber: 34,
    name: 'Daily Vault: Sound Check',
    description: 'Your first unlocked vault.',
    phase: 'daily',
    hintPolicy: 'none',
    hint: null,
  },
  {
    number: 5,
    puzzleNumber: 35,
    name: 'Daily Vault: Deep Current',
    description: 'Follow the closest meaning.',
    phase: 'daily',
    hintPolicy: 'none',
    hint: null,
  },
  {
    number: 6,
    puzzleNumber: 36,
    name: 'Daily Vault: Green Room',
    description: 'A fresh puzzle is waiting.',
    phase: 'daily',
    hintPolicy: 'none',
    hint: null,
  },
  {
    number: 7,
    puzzleNumber: 37,
    name: 'Clue Drop: Stage Door',
    description: 'A designed clue drop brightens today’s vault.',
    phase: 'daily',
    hintPolicy: 'opening',
    hint: 'Curtains rise, performers wait backstage, and an audience gathers for the show.',
  },
  {
    number: 8,
    puzzleNumber: 38,
    name: 'Daily Vault: Flow Line',
    description: 'Keep your streak of discoveries moving.',
    phase: 'daily',
    hintPolicy: 'none',
    hint: null,
  },
  {
    number: 9,
    puzzleNumber: 39,
    name: 'Daily Vault: Wild Canopy',
    description: 'One secret word. Unlimited paths in.',
    phase: 'daily',
    hintPolicy: 'none',
    hint: null,
  },
  {
    number: 10,
    puzzleNumber: 40,
    name: 'Clue Drop: Morning Ritual',
    description: 'A clue unlocks after fifteen unique guesses.',
    phase: 'daily',
    hintPolicy: 'guess_threshold',
    hint: 'Steam, a favorite mug, and a familiar aroma start many mornings.',
  },
  {
    number: 11,
    puzzleNumber: 41,
    name: 'Daily Vault: Six Strings',
    description: 'The vault is humming with a new challenge.',
    phase: 'daily',
    hintPolicy: 'none',
    hint: null,
  },
  {
    number: 12,
    puzzleNumber: 42,
    name: 'Daily Vault: Neon Grid',
    description: 'Find the hidden word in the buzz.',
    phase: 'daily',
    hintPolicy: 'none',
    hint: null,
  },
  {
    number: 13,
    puzzleNumber: 43,
    name: 'Daily Vault: Shared Table',
    description: 'Warm up with a fresh semantic trail.',
    phase: 'daily',
    hintPolicy: 'none',
    hint: null,
  },
  {
    number: 14,
    puzzleNumber: 44,
    name: 'Clue Drop: Gallery Pass',
    description: 'Today’s vault arrives with a guiding clue.',
    phase: 'daily',
    hintPolicy: 'opening',
    hint: 'Curated rooms preserve objects, stories, and artifacts for curious visitors.',
  },
  {
    number: 15,
    puzzleNumber: 45,
    name: 'Daily Vault: Night Orbit',
    description: 'One last clue-free orbit for this bundle.',
    phase: 'daily',
    hintPolicy: 'none',
    hint: null,
  },
  {
    number: 16,
    puzzleNumber: 46,
    name: 'Daily Vault: Market Maze',
    description: 'Find the word among the noise and motion.',
    phase: 'daily',
    hintPolicy: 'none',
    hint: null,
  },
  {
    number: 17,
    puzzleNumber: 47,
    name: 'Clue Drop: Shutter Flash',
    description: 'A bright clue drop is waiting in this vault.',
    phase: 'daily',
    hintPolicy: 'opening',
    hint: 'A lens frames a moment before a quick shutter preserves it.',
  },
  {
    number: 18,
    puzzleNumber: 48,
    name: 'Daily Vault: House Call',
    description: 'Warm up with a fresh semantic trail.',
    phase: 'daily',
    hintPolicy: 'none',
    hint: null,
  },
  {
    number: 19,
    puzzleNumber: 49,
    name: 'Daily Vault: Cold Front',
    description: 'A new pattern is moving through the vault.',
    phase: 'daily',
    hintPolicy: 'none',
    hint: null,
  },
  {
    number: 20,
    puzzleNumber: 50,
    name: 'Daily Vault: Blue Marble',
    description: 'Keep orbiting the closest meanings.',
    phase: 'daily',
    hintPolicy: 'none',
    hint: null,
  },
  {
    number: 21,
    puzzleNumber: 51,
    name: 'Clue Drop: Open Tab',
    description: 'A clue arrives after fifteen unique guesses.',
    phase: 'daily',
    hintPolicy: 'guess_threshold',
    hint: 'A financial record can enable a purchase, then asks for repayment.',
  },
  {
    number: 22,
    puzzleNumber: 52,
    name: 'Daily Vault: Build Queue',
    description: 'One hidden word is ready for its next move.',
    phase: 'daily',
    hintPolicy: 'none',
    hint: null,
  },
  {
    number: 23,
    puzzleNumber: 53,
    name: 'Daily Vault: Tide Line',
    description: 'Follow the heat toward landfall.',
    phase: 'daily',
    hintPolicy: 'none',
    hint: null,
  },
  {
    number: 24,
    puzzleNumber: 54,
    name: 'Daily Vault: Stable Ground',
    description: 'Hold a steady pace toward the answer.',
    phase: 'daily',
    hintPolicy: 'none',
    hint: null,
  },
] as const;

const LEVEL_BY_NUMBER = new Map(CLUELESS_SOLO_LEVELS.map((level) => [level.number, level]));

export function cluelessSoloLevelByNumber(number: number): CluelessSoloLevel | undefined {
  return LEVEL_BY_NUMBER.get(number);
}

export function puzzleForCluelessSoloLevel(level: CluelessSoloLevel): Puzzle {
  const puzzle = puzzleByNumber(level.puzzleNumber);
  if (!puzzle) throw new Error(`Missing Clueless puzzle ${level.puzzleNumber} for level ${level.number}`);
  return puzzle;
}

export function isCluelessDailyVault(level: CluelessSoloLevel): boolean {
  return level.number >= FIRST_DAILY_VAULT_LEVEL;
}
