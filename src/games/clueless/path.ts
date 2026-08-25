/**
 * Solo Clueless path progression.
 *
 * The content catalog is bundled, but this personal path decides which one
 * level is currently playable. Tutorial levels open back-to-back; every later
 * completion schedules the next vault for the player's next local midnight.
 */

export const FIRST_DAILY_VAULT_LEVEL = 4;

export type CluelessPathProgress = {
  /** Highest solo level the player has completed. Zero means the path is new. */
  completedThrough: number;
  /**
   * Local calendar day (`YYYY-MM-DD`) on which the current Daily Vault opens.
   * Tutorial levels do not need a calendar gate.
   */
  nextUnlockOn: string | null;
};

export const EMPTY_CLUELESS_PATH: CluelessPathProgress = {
  completedThrough: 0,
  nextUnlockOn: null,
};

export type CluelessPathPhase = 'tutorial' | 'daily';
export type CluelessPathAvailability = 'playable' | 'waiting';

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Local calendar day as `YYYY-MM-DD`; this path is intentionally personal. */
export function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localDateForDayKey(value: string): Date | null {
  const match = DAY_KEY.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

/** The following local calendar day, including across daylight-saving changes. */
export function nextLocalDayKey(now: Date): string {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return localDayKey(tomorrow);
}

export function pathPhaseForLevel(levelNumber: number): CluelessPathPhase {
  return levelNumber < FIRST_DAILY_VAULT_LEVEL ? 'tutorial' : 'daily';
}

export function currentCluelessPathLevel(progress: CluelessPathProgress): number {
  return Math.max(1, progress.completedThrough + 1);
}

export function availabilityForCluelessPathLevel(
  progress: CluelessPathProgress,
  levelNumber: number,
  now: Date,
): CluelessPathAvailability {
  if (levelNumber !== currentCluelessPathLevel(progress)) return 'waiting';
  if (pathPhaseForLevel(levelNumber) === 'tutorial') return 'playable';
  if (!progress.nextUnlockOn) return 'waiting';
  return localDayKey(now) >= progress.nextUnlockOn ? 'playable' : 'waiting';
}

/**
 * Progress exactly one current level. Completing a tutorial immediately opens
 * the next tutorial; completing level 3 or any Daily Vault starts the next
 * local-day wait.
 */
export function completeCluelessPathLevel(
  progress: CluelessPathProgress,
  levelNumber: number,
  now: Date,
): CluelessPathProgress {
  if (levelNumber !== currentCluelessPathLevel(progress)) return progress;
  const nextLevel = levelNumber + 1;
  return {
    completedThrough: levelNumber,
    nextUnlockOn:
      pathPhaseForLevel(nextLevel) === 'daily' ? nextLocalDayKey(now) : null,
  };
}

export function nextCluelessPathUnlockAt(progress: CluelessPathProgress): Date | null {
  return progress.nextUnlockOn ? localDateForDayKey(progress.nextUnlockOn) : null;
}

export function isCluelessPathProgress(value: unknown): value is CluelessPathProgress {
  if (typeof value !== 'object' || value === null) return false;
  const progress = value as Record<string, unknown>;
  return (
    typeof progress.completedThrough === 'number' &&
    Number.isInteger(progress.completedThrough) &&
    progress.completedThrough >= 0 &&
    (progress.nextUnlockOn === null ||
      (typeof progress.nextUnlockOn === 'string' &&
        localDateForDayKey(progress.nextUnlockOn) !== null))
  );
}
