import { describe, expect, it } from 'vitest';
import { pickEmailHero } from './player-email-html';
import {
  collectWeekNews,
  favoriteGameFromScores,
  isPlayerFacing,
  parseChangelog,
  thisWeekWordfall,
  weekHasNews,
  weeklyBroadcastName,
} from './player-email-news';

const changelog = `## [0.8.4] - 2026-08-25

### Added
- **Tuesday Resend Broadcast** (\`pipeline/player-email.ts\`). OpenAI drafts copy (D-054).

## [0.8.3] - 2026-08-25

### Added
- **Teams are now CRUD, not create-and-stuck.** The owner can rename or disband the crew.

### Fixed
- **Phone chrome fills the phone; laptop chrome is a laptop column.**

## [0.8.2] - 2026-08-18

### Changed
- Wikipedia popularity snapshot refreshed (\`wikipedia-pageviews:20260201-20260731\`)

## [0.7.0] - 2026-08-10

### Added
- **Clueless has Easy, Standard, and Expert.**
`;

const weekly = {
  number: 12,
  name: 'Gauntlet',
  description: 'Clear eight crates before the board fills.',
  availableFrom: '2026-08-24',
};
const launch = { number: 1, name: 'First Words', description: 'Find six words.' };

describe('parseChangelog', () => {
  it('keeps version, date, and section on each bullet', () => {
    const bullets = parseChangelog(changelog);
    expect(bullets[0]).toMatchObject({
      version: '0.8.4',
      date: '2026-08-25',
      section: 'Added',
    });
    expect(bullets.some((bullet) => bullet.text.includes('Teams are now CRUD'))).toBe(true);
  });
});

describe('isPlayerFacing', () => {
  it('drops pipeline, tests, and snapshot work', () => {
    expect(isPlayerFacing('**Teams are now CRUD.** The owner can rename.')).toBe(true);
    expect(isPlayerFacing('Tuesday Resend Broadcast (`pipeline/player-email.ts`).')).toBe(false);
    expect(isPlayerFacing('Wikipedia popularity snapshot refreshed')).toBe(false);
    expect(isPlayerFacing('OpenAI drafts copy (D-054).')).toBe(false);
    expect(isPlayerFacing('OpenRouter drafts copy.')).toBe(false);
  });
});

describe('collectWeekNews', () => {
  it('takes player-facing bullets from the lookback window plus this week’s Wordfall', () => {
    const news = collectWeekNews(changelog, [launch, weekly], new Date('2026-08-25T12:00:00'), 7);
    expect(news.weekMonday).toBe('2026-08-24');
    expect(news.wordfall?.name).toBe('Gauntlet');
    expect(news.bullets.map((bullet) => bullet.text).join('\n')).toContain('Teams are now CRUD');
    expect(news.bullets.map((bullet) => bullet.text).join('\n')).not.toContain('Resend');
    expect(news.bullets.map((bullet) => bullet.text).join('\n')).not.toContain('Wikipedia');
    expect(news.bullets.map((bullet) => bullet.text).join('\n')).not.toContain('Clueless has Easy');
    expect(weekHasNews(news)).toBe(true);
  });

  it('is empty when nothing player-facing shipped and no drop is live', () => {
    const news = collectWeekNews(
      changelog,
      [launch],
      new Date('2026-08-17T12:00:00'),
      7,
    );
    expect(news.wordfall).toBeNull();
    expect(news.bullets).toEqual([]);
    expect(weekHasNews(news)).toBe(false);
  });

  it('names the broadcast after that week’s Monday, not a forever-static roundup', () => {
    expect(weeklyBroadcastName('2026-08-24')).toBe('WordKrush weekly 2026-08-24');
  });
});

describe('thisWeekWordfall', () => {
  it('returns only a dated drop whose Monday is this week', () => {
    const now = new Date('2026-08-25T12:00:00');
    expect(thisWeekWordfall([launch, weekly], now)).toEqual(weekly);
    expect(thisWeekWordfall([launch, weekly], new Date('2026-08-23T12:00:00'))).toBeNull();
    expect(thisWeekWordfall([launch, weekly], new Date('2026-08-31T12:00:00'))).toBeNull();
  });
});

describe('favoriteGameFromScores', () => {
  it('uses the most recent play, not the highest score', () => {
    const rows = [
      { player_id: 'p1', game_id: 'more-or-less', played_at: '2026-08-20T10:00:00Z' },
      { player_id: 'p1', game_id: 'wordfall', played_at: '2026-08-24T10:00:00Z' },
      { player_id: 'p2', game_id: 'clueless', played_at: '2026-08-24T10:00:00Z' },
    ];
    expect(favoriteGameFromScores(rows, 'p1')).toBe('Wordfall');
    expect(favoriteGameFromScores(rows, 'p2')).toBe('Clueless');
    expect(favoriteGameFromScores(rows, 'p3')).toBeUndefined();
  });
});

describe('pickEmailHero', () => {
  it('uses Wordfall key art when a drop is live, else the matching game or hub', () => {
    const withDrop = collectWeekNews(changelog, [launch, weekly], new Date('2026-08-25T12:00:00'), 7);
    expect(pickEmailHero(withDrop).file).toBe('wordfall.png');
    const teamsOnly = collectWeekNews(
      '## [0.8.3] - 2026-08-25\n\n### Added\n- **Teams are now CRUD.** The owner can rename.\n',
      [launch],
      new Date('2026-08-25T12:00:00'),
      7,
    );
    expect(pickEmailHero(teamsOnly)).toEqual({ file: 'hub.png', alt: 'WordKrush — pick a game' });
    const clueless = collectWeekNews(
      '## [0.8.0] - 2026-08-25\n\n### Added\n- **Clueless has Easy, Standard, and Expert.**\n',
      [launch],
      new Date('2026-08-25T12:00:00'),
      7,
    );
    expect(pickEmailHero(clueless).file).toBe('clueless.png');
  });
});
