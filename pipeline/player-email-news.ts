/**
 * What a Tuesday player email is allowed to talk about.
 *
 * Facts come from the changelog (player-facing bullets in the lookback window)
 * plus this week's Wordfall drop. Infra, tests, and pipeline work stay out.
 */
import { startOfLocalDay, startOfLocalWeek } from '../src/games/wordfall/schedule';
import { isNewestRelease } from '../src/games/wordfall/schedule';
import type { Level } from '../src/games/wordfall/types';

const VERSION_HEADING = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})\s*$/;
const BULLET = /^- (.+)$/;

const INFRA =
  /\b(check:docs|github actions?|workflow|migration|tsconfig|typecheck|vitest|reducer|no-op|nixpacks|railway|docs audit|version-only|expo_public_|d-\d{3}|st-\d+|resend|broadcast|auth templates?|pipeline\/|npm run check|wikipedia popularity snapshot|player .what.s new. email|openapi|openai|openrouter)\b/i;

export const GAME_LABELS = {
  'more-or-less': 'More or Less',
  clueless: 'Clueless',
  wordfall: 'Wordfall',
} as const;

export type GameId = keyof typeof GAME_LABELS;

export type ChangelogBullet = {
  version: string;
  date: string;
  section: string;
  text: string;
};

export type WeekNews = {
  weekMonday: string;
  lookbackDays: number;
  bullets: ChangelogBullet[];
  wordfall: Pick<Level, 'number' | 'name' | 'description' | 'availableFrom'> | null;
};

export function isoDay(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function weekMondayOf(now: Date): string {
  return isoDay(startOfLocalWeek(now));
}

export function parseChangelog(markdown: string): ChangelogBullet[] {
  const lines = markdown.split(/\r?\n/);
  const bullets: ChangelogBullet[] = [];
  let version = '';
  let date = '';
  let section = '';
  for (const line of lines) {
    const heading = VERSION_HEADING.exec(line);
    if (heading) {
      version = heading[1];
      date = heading[2];
      section = '';
      continue;
    }
    const sectionMatch = /^### (.+)\s*$/.exec(line);
    if (sectionMatch) {
      section = sectionMatch[1];
      continue;
    }
    const bullet = BULLET.exec(line);
    if (bullet && version && date) {
      bullets.push({ version, date, section, text: bullet[1].trim() });
    }
  }
  return bullets;
}

export function isPlayerFacing(text: string): boolean {
  return !INFRA.test(text);
}

export function thisWeekWordfall(
  levels: readonly Pick<Level, 'number' | 'name' | 'description' | 'availableFrom'>[],
  now: Date,
): (typeof levels)[number] | null {
  const fresh = levels.filter((level) => isNewestRelease(level, now));
  if (fresh.length === 0) return null;
  return fresh.reduce((best, level) => (level.number > best.number ? level : best));
}

export function collectWeekNews(
  markdown: string,
  levels: readonly Pick<Level, 'number' | 'name' | 'description' | 'availableFrom'>[],
  now: Date,
  lookbackDays: number,
): WeekNews {
  const today = isoDay(now);
  const cutoff = startOfLocalDay(now);
  cutoff.setDate(cutoff.getDate() - (lookbackDays - 1));
  const cutoffDay = isoDay(cutoff);
  const bullets = parseChangelog(markdown)
    .filter(
      (bullet) =>
        bullet.date >= cutoffDay && bullet.date <= today && isPlayerFacing(bullet.text),
    )
    .slice(0, 8);
  return {
    weekMonday: weekMondayOf(now),
    lookbackDays,
    bullets,
    wordfall: thisWeekWordfall(levels, now),
  };
}

export function weekHasNews(news: WeekNews): boolean {
  return news.bullets.length > 0 || news.wordfall !== null;
}

export function weeklyBroadcastName(weekMonday: string): string {
  return `WordKrush weekly ${weekMonday}`;
}

export function favoriteGamesByPlayer(
  rows: readonly { player_id: string; game_id: string; played_at: string }[],
): Map<string, string> {
  const latest = new Map<string, { game_id: string; played_at: string }>();
  for (const row of rows) {
    const prev = latest.get(row.player_id);
    if (!prev || row.played_at > prev.played_at) latest.set(row.player_id, row);
  }
  const out = new Map<string, string>();
  for (const [playerId, row] of latest) {
    if (row.game_id in GAME_LABELS) {
      out.set(playerId, GAME_LABELS[row.game_id as GameId]);
    }
  }
  return out;
}

export function favoriteGameFromScores(
  rows: readonly { player_id: string; game_id: string; played_at: string }[],
  playerId: string,
): string | undefined {
  return favoriteGamesByPlayer(rows).get(playerId);
}

export function newsFacts(news: WeekNews): string {
  const lines: string[] = [];
  if (news.wordfall) {
    lines.push(
      `Wordfall this week: level ${news.wordfall.number} "${news.wordfall.name}" — ${news.wordfall.description}`,
    );
  }
  for (const bullet of news.bullets) {
    lines.push(`${bullet.date} ${bullet.section}: ${stripMd(bullet.text)}`);
  }
  return lines.join('\n');
}

export function stripMd(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
}
