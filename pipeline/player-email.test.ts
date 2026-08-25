import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  isSkippableRecipient,
  lookbackDays,
  parseArgs,
  parseMode,
  planPlayerEmail,
  usernameOf,
  weeklyBroadcastName,
} from './player-email';
import { fallbackDraft, FIRST_NAME_TOKEN, GAME_TOKEN } from './player-email-draft';
import { collectWeekNews, type WeekNews } from './player-email-news';

const weekly = {
  number: 12,
  name: 'Gauntlet',
  description: 'Clear eight crates before the board fills.',
  availableFrom: '2026-08-24',
};
const launch = {
  number: 1,
  name: 'First Words',
  description: 'Find six words.',
};

const changelog = `## [0.8.3] - 2026-08-25

### Added
- **Teams are now CRUD.** The owner can rename or disband the crew.

### Fixed
- **Phone chrome fills the phone.**

## [0.8.2] - 2026-08-25

### Changed
- Wikipedia popularity snapshot refreshed (\`wikipedia-pageviews:20260201-20260731\`)
`;

function newsOn(now: Date, days = 7): WeekNews {
  return collectWeekNews(changelog, [launch, weekly], now, days);
}

describe('parseArgs', () => {
  it('defaults to a dry auto run', () => {
    expect(parseArgs([])).toEqual({ send: false, mode: 'auto' });
  });

  it('lets --dry-run win over --send', () => {
    expect(parseArgs(['--send', '--dry-run', '--mode', 'weekly'])).toEqual({
      send: false,
      mode: 'weekly',
    });
  });

  it('rejects an unknown mode', () => {
    expect(() => parseMode('blast')).toThrow(/auto, whats-new, or weekly/);
  });

  it('gives whats-new a longer lookback than the Tuesday job', () => {
    expect(lookbackDays('auto')).toBe(7);
    expect(lookbackDays('weekly')).toBe(7);
    expect(lookbackDays('whats-new')).toBe(14);
  });
});

describe('planPlayerEmail', () => {
  it('mails this week’s Wordfall and changelog together, named by Monday', () => {
    const now = new Date('2026-08-25T12:00:00');
    const news = newsOn(now);
    const plan = planPlayerEmail('auto', news, fallbackDraft(news));
    expect(plan?.name).toBe(weeklyBroadcastName('2026-08-24'));
    expect(plan?.subject).toContain('Gauntlet');
    expect(plan?.html).toContain('Gauntlet');
    expect(plan?.html).toContain('Clear eight crates before the board fills.');
    expect(plan?.html).toContain(FIRST_NAME_TOKEN);
    expect(plan?.html).toContain(GAME_TOKEN);
    expect(plan?.html).toContain('https://wordkrush.com/email/wordfall.png');
    expect(plan?.html).toContain('Teams are now CRUD.');
    expect(plan?.html).not.toContain('Wikipedia popularity');
    expect(plan?.html).not.toContain('<script>');
  });

  it('skips a quiet auto week instead of repeating a static roundup', () => {
    const news = collectWeekNews(
      '## [0.8.2] - 2026-08-18\n\n### Changed\n- Wikipedia popularity snapshot refreshed\n',
      [launch],
      new Date('2026-08-25T12:00:00'),
      7,
    );
    expect(planPlayerEmail('auto', news, fallbackDraft(news))).toBeNull();
  });

  it('fails closed in weekly mode when there is nothing player-facing', () => {
    const news = collectWeekNews(
      '## [0.8.2] - 2026-08-18\n\n### Changed\n- Wikipedia popularity snapshot refreshed\n',
      [launch],
      new Date('2026-08-25T12:00:00'),
      7,
    );
    expect(() => planPlayerEmail('weekly', news, fallbackDraft(news))).toThrow(
      /No player-facing news this week/,
    );
  });

  it('escapes a hostile Wordfall name so it cannot break the HTML', () => {
    const news: WeekNews = {
      weekMonday: '2026-08-24',
      lookbackDays: 7,
      bullets: [],
      wordfall: {
        number: 12,
        name: '<script>x</script>',
        description: 'a & b',
        availableFrom: '2026-08-24',
      },
    };
    const html = planPlayerEmail('auto', news, fallbackDraft(news))?.html ?? '';
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(html).toContain('a &amp; b');
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain(FIRST_NAME_TOKEN);
  });
});

describe('recipients', () => {
  it('skips the local test player and anyone without an email', () => {
    expect(isSkippableRecipient(undefined, 'me@x.com')).toBe(true);
    expect(isSkippableRecipient('ai-tester@invalid.wordkrush', undefined)).toBe(true);
    expect(isSkippableRecipient('Me@X.com', 'me@x.com')).toBe(true);
    expect(isSkippableRecipient('player@example.com', 'me@x.com')).toBe(false);
  });

  it('reads the public username, not the email local-part', () => {
    expect(usernameOf({ username: 'Nova' })).toBe('Nova');
    expect(usernameOf({})).toBeUndefined();
  });
});

describe('escapeHtml', () => {
  it('escapes quotes as well as tags', () => {
    expect(escapeHtml('"hi"')).toBe('&quot;hi&quot;');
  });
});
